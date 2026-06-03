'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import {
  enviarConfirmacionCliente,
  enviarRechazoCliente,
} from '@/lib/email/notificar-cliente';

export interface EstadoAccion {
  error?: string;
  ok?: string;
}

const idSchema = z.string().uuid();

/**
 * Vulcanos se asigna como gestor de una reserva pendiente sin gestor.
 * Después de esto puede confirmarla y ganar la comisión.
 */
export async function tomarReservaVulcanos(
  _prev: EstadoAccion | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await getSesionAdminEstricto();
  if (sesion.perfil.rol !== 'vulcanos') {
    return { error: 'Solo Vulcanos Tours puede tomar reservas.' };
  }

  const reservaId = idSchema.safeParse(formData.get('reserva_id'));
  if (!reservaId.success) return { error: 'ID de reserva inválido.' };

  const admin = createAdminClient();
  const { data: reserva } = await admin
    .from('reservas')
    .select('estado, gestor_id')
    .eq('id', reservaId.data)
    .maybeSingle();
  if (!reserva) return { error: 'Reserva no encontrada.' };
  if (reserva.estado !== 'pendiente') return { error: 'Solo se pueden tomar reservas pendientes.' };
  if (reserva.gestor_id) return { error: 'Esta reserva ya tiene gestor asignado.' };

  const { error } = await admin
    .from('reservas')
    .update({ gestor_id: sesion.user_id })
    .eq('id', reservaId.data);
  if (error) return { error: error.message };

  revalidatePath(`/admin/reservas/${reservaId.data}`);
  revalidatePath('/admin/reservas');
  return { ok: 'Reserva asignada a ti. Ahora puedes confirmarla.' };
}

/**
 * Confirma una reserva pendiente. Bloquea las fechas (vía el trigger
 * reserva_no_solape), genera comisión si hay gestor, envía email cliente.
 */
export async function confirmarReserva(
  _prev: EstadoAccion | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await getSesionAdminEstricto();
  const reservaId = idSchema.safeParse(formData.get('reserva_id'));
  if (!reservaId.success) return { error: 'ID inválido.' };

  const admin = createAdminClient();
  const { data: r } = await admin
    .from('reservas')
    .select(
      'id, estado, gestor_id, total_usd, modalidad, fecha_inicio, fecha_fin, num_personas, cliente_nombre, cliente_email, posadas(nombre), apartamentos(nombre)',
    )
    .eq('id', reservaId.data)
    .maybeSingle();
  if (!r) return { error: 'Reserva no encontrada.' };
  if (r.estado !== 'pendiente') return { error: `No se puede confirmar una reserva ${r.estado}.` };

  // Validación de permisos:
  // - Dueño puede confirmar cualquiera
  // - Vulcanos puede confirmar SOLO si él es el gestor
  // - Conserje y Contador no pueden confirmar
  if (sesion.perfil.rol === 'conserje' || sesion.perfil.rol === 'contador') {
    return { error: 'Tu rol no puede confirmar reservas.' };
  }
  if (sesion.perfil.rol === 'vulcanos' && r.gestor_id !== sesion.user_id) {
    return { error: 'Solo puedes confirmar reservas que tú gestionas.' };
  }

  // 1) Actualizar estado a confirmada. El trigger reserva_no_solape
  //    validará que no haya choque de fechas con otras confirmadas.
  const { error: errConf } = await admin
    .from('reservas')
    .update({ estado: 'confirmada', confirmada_at: new Date().toISOString() })
    .eq('id', r.id);
  if (errConf) {
    // El trigger devuelve mensaje en español si hay solape
    return { error: errConf.message };
  }

  // 2) Generar comisión si corresponde
  //    - Solo si hay gestor_id (NULL = directo del dueño, sin comisión)
  //    - Verificar que el gestor sea vulcanos o conserje
  if (r.gestor_id) {
    const { data: gestor } = await admin
      .from('usuarios')
      .select('rol')
      .eq('id', r.gestor_id)
      .maybeSingle();
    if (gestor && (gestor.rol === 'vulcanos' || gestor.rol === 'conserje')) {
      const monto = Number(r.total_usd) * 0.10;
      const { error: errCom } = await admin
        .from('comisiones')
        .insert({
          reserva_id: r.id,
          beneficiario_id: r.gestor_id,
          porcentaje: 10.00,
          monto_usd: monto.toFixed(2),
          estado: 'pendiente',
        });
      if (errCom) {
        console.error('[confirmar] no se pudo crear comisión:', errCom);
        // No bloqueamos la confirmación por esto — la comisión se puede crear manualmente luego
      }
    }
  }

  // 3) Email al cliente
  const posada = pickFirst<{ nombre: string }>(r.posadas);
  const apto = pickFirst<{ nombre: string }>(r.apartamentos);
  await enviarConfirmacionCliente({
    cliente_email: r.cliente_email as string,
    cliente_nombre: r.cliente_nombre as string,
    posada_nombre: posada?.nombre ?? 'Posada',
    modalidad: r.modalidad as 'apartamento' | 'completa',
    apartamento_nombre: apto?.nombre ?? null,
    fecha_inicio: r.fecha_inicio as string,
    fecha_fin: r.fecha_fin as string,
    num_personas: r.num_personas as number,
    total_usd: Number(r.total_usd),
    reserva_id: r.id as string,
  });

  revalidatePath(`/admin/reservas/${r.id}`);
  revalidatePath('/admin/reservas');
  revalidatePath('/admin');
  return { ok: 'Reserva confirmada y email enviado al cliente.' };
}

/**
 * Rechaza una reserva pendiente, registrando un motivo y enviando email
 * al cliente.
 */
export async function rechazarReserva(
  _prev: EstadoAccion | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await getSesionAdminEstricto();
  const reservaId = idSchema.safeParse(formData.get('reserva_id'));
  const motivo = String(formData.get('motivo') ?? '').trim();

  if (!reservaId.success) return { error: 'ID inválido.' };
  if (motivo.length < 5) return { error: 'Explica el motivo (mínimo 5 caracteres).' };

  const admin = createAdminClient();
  const { data: r } = await admin
    .from('reservas')
    .select('id, estado, gestor_id, fecha_inicio, fecha_fin, cliente_nombre, cliente_email, posadas(nombre)')
    .eq('id', reservaId.data)
    .maybeSingle();
  if (!r) return { error: 'Reserva no encontrada.' };
  if (r.estado !== 'pendiente') return { error: `No se puede rechazar una reserva ${r.estado}.` };

  if (sesion.perfil.rol === 'conserje' || sesion.perfil.rol === 'contador') {
    return { error: 'Tu rol no puede rechazar reservas.' };
  }
  if (sesion.perfil.rol === 'vulcanos' && r.gestor_id !== sesion.user_id) {
    return { error: 'Solo puedes rechazar reservas que tú gestionas.' };
  }

  const { error } = await admin
    .from('reservas')
    .update({
      estado: 'rechazada',
      motivo_rechazo: motivo,
    })
    .eq('id', r.id);
  if (error) return { error: error.message };

  const posada = pickFirst<{ nombre: string }>(r.posadas);
  await enviarRechazoCliente({
    cliente_email: r.cliente_email as string,
    cliente_nombre: r.cliente_nombre as string,
    posada_nombre: posada?.nombre ?? 'Posada',
    fecha_inicio: r.fecha_inicio as string,
    fecha_fin: r.fecha_fin as string,
    motivo,
    reserva_id: r.id as string,
  });

  revalidatePath(`/admin/reservas/${r.id}`);
  revalidatePath('/admin/reservas');
  return { ok: 'Reserva rechazada y email enviado al cliente.' };
}

function pickFirst<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

// =====================================================================
// Editar reserva (Onda 5)
// =====================================================================
const editarSchema = z.object({
  reserva_id: z.string().uuid(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  modalidad: z.enum(['apartamento', 'completa']),
  apartamento_id: z.string().uuid().nullable().optional(),
  apartamentos_ids: z.array(z.string().uuid()).default([]),
  num_personas: z.coerce.number().int().positive().max(50),
  num_personas_extras: z.coerce.number().int().min(0).max(50).default(0),
  cliente_nombre: z.string().min(1).max(200),
  cliente_telefono: z.string().min(1).max(50),
  cliente_email: z.string().email().max(200),
  notas: z.string().max(2000).optional().nullable(),
  descuento_usd: z.coerce.number().min(0).default(0),
  servicio_extra_usd: z.coerce.number().min(0).default(0),
  total_usd: z.coerce.number().min(0),
});

export async function editarReserva(
  _prev: EstadoAccion | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await getSesionAdminEstricto();

  const aptosIds = formData.getAll('apartamentos_ids').filter((v): v is string => typeof v === 'string' && v.length > 0);
  const apto = formData.get('apartamento_id');
  const datos = {
    reserva_id: formData.get('reserva_id'),
    fecha_inicio: formData.get('fecha_inicio'),
    fecha_fin: formData.get('fecha_fin'),
    modalidad: formData.get('modalidad'),
    apartamento_id: apto && apto !== '' ? apto : null,
    apartamentos_ids: aptosIds,
    num_personas: formData.get('num_personas'),
    num_personas_extras: formData.get('num_personas_extras') || 0,
    cliente_nombre: formData.get('cliente_nombre'),
    cliente_telefono: formData.get('cliente_telefono'),
    cliente_email: formData.get('cliente_email'),
    notas: formData.get('notas') || null,
    descuento_usd: formData.get('descuento_usd') || 0,
    servicio_extra_usd: formData.get('servicio_extra_usd') || 0,
    total_usd: formData.get('total_usd'),
  };

  const v = editarSchema.safeParse(datos);
  if (!v.success) return { error: v.error.issues[0]?.message ?? 'Datos inválidos.' };
  const d = v.data;

  const admin = createAdminClient();
  const { data: r } = await admin
    .from('reservas')
    .select('id, estado, gestor_id')
    .eq('id', d.reserva_id)
    .maybeSingle();
  if (!r) return { error: 'Reserva no encontrada.' };

  // Permisos: Dueño todo. Vulcanos solo las suyas.
  if (sesion.perfil.rol === 'conserje' || sesion.perfil.rol === 'contador') {
    return { error: 'Tu rol no puede editar reservas.' };
  }
  if (sesion.perfil.rol === 'vulcanos' && r.gestor_id !== sesion.user_id) {
    return { error: 'Solo puedes editar reservas que tú gestionas.' };
  }

  const { error } = await admin
    .from('reservas')
    .update({
      fecha_inicio: d.fecha_inicio,
      fecha_fin: d.fecha_fin,
      modalidad: d.modalidad,
      apartamento_id: d.apartamento_id ?? null,
      apartamentos_ids: d.apartamentos_ids.length > 0 ? d.apartamentos_ids : null,
      num_personas: d.num_personas,
      num_personas_extras: d.num_personas_extras,
      cliente_nombre: d.cliente_nombre,
      cliente_telefono: d.cliente_telefono,
      cliente_email: d.cliente_email,
      notas: d.notas,
      descuento_usd: d.descuento_usd,
      servicio_extra_usd: d.servicio_extra_usd,
      total_usd: d.total_usd,
    })
    .eq('id', d.reserva_id);
  if (error) return { error: error.message };

  revalidatePath(`/admin/reservas/${d.reserva_id}`);
  revalidatePath('/admin/reservas');
  return { ok: 'Reserva actualizada.' };
}

// =====================================================================
// Eliminar reserva (soft-delete)
// =====================================================================
export async function eliminarReserva(
  _prev: EstadoAccion | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await getSesionAdminEstricto();
  const id = idSchema.safeParse(formData.get('reserva_id'));
  if (!id.success) return { error: 'ID inválido.' };

  const admin = createAdminClient();
  const { data: r } = await admin
    .from('reservas')
    .select('id, estado, gestor_id')
    .eq('id', id.data)
    .maybeSingle();
  if (!r) return { error: 'Reserva no encontrada.' };

  if (sesion.perfil.rol === 'conserje' || sesion.perfil.rol === 'contador') {
    return { error: 'Tu rol no puede eliminar reservas.' };
  }
  if (sesion.perfil.rol === 'vulcanos' && r.gestor_id !== sesion.user_id) {
    return { error: 'Solo puedes eliminar reservas que tú gestionas.' };
  }

  const { error } = await admin
    .from('reservas')
    .update({ eliminada_at: new Date().toISOString() })
    .eq('id', id.data);
  if (error) return { error: error.message };

  revalidatePath(`/admin/reservas/${id.data}`);
  revalidatePath('/admin/reservas');
  return { ok: 'Reserva eliminada.' };
}

export async function restaurarReserva(
  _prev: EstadoAccion | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await getSesionAdminEstricto();
  if (sesion.perfil.rol !== 'dueno') return { error: 'Solo el Dueño puede restaurar reservas.' };

  const id = idSchema.safeParse(formData.get('reserva_id'));
  if (!id.success) return { error: 'ID inválido.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('reservas')
    .update({ eliminada_at: null })
    .eq('id', id.data);
  if (error) return { error: error.message };

  revalidatePath('/admin/reservas');
  return { ok: 'Reserva restaurada.' };
}
