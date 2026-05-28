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
