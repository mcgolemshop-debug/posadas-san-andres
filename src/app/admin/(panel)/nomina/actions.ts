'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { exigirRol } from '@/lib/auth/session';

export interface EstadoNomina {
  error?: string;
  ok?: string;
}

// =====================================================================
// Configurar sueldo mensual de un conserje
// =====================================================================
const sueldoSchema = z.object({
  usuario_id: z.string().uuid(),
  sueldo_mensual_usd: z.coerce.number().min(0),
});

export async function actualizarSueldoConserje(
  _prev: EstadoNomina | null,
  formData: FormData,
): Promise<EstadoNomina> {
  await exigirRol(['dueno']);
  const d = sueldoSchema.safeParse({
    usuario_id: formData.get('usuario_id'),
    sueldo_mensual_usd: formData.get('sueldo_mensual_usd'),
  });
  if (!d.success) return { error: 'Datos inválidos.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('usuarios')
    .update({ sueldo_mensual_usd: d.data.sueldo_mensual_usd })
    .eq('id', d.data.usuario_id);
  if (error) return { error: error.message };

  revalidatePath('/admin/nomina');
  return { ok: 'Sueldo actualizado.' };
}

// =====================================================================
// Generar nómina del mes (sueldos fijos para todos los conserjes activos)
// =====================================================================
const generarSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM.'),
});

export async function generarNominaDelMes(
  _prev: EstadoNomina | null,
  formData: FormData,
): Promise<EstadoNomina> {
  await exigirRol(['dueno']);
  const d = generarSchema.safeParse({ mes: formData.get('mes') });
  if (!d.success) return { error: d.error.issues[0]?.message ?? 'Mes inválido.' };

  const [anyo, mesNum] = d.data.mes.split('-').map(Number);
  const primerDia = `${d.data.mes}-01`;
  const ultimoDia = new Date(anyo, mesNum, 0).toISOString().slice(0, 10);

  const admin = createAdminClient();

  // Conserjes activos con sueldo configurado
  const { data: conserjes, error: errCons } = await admin
    .from('usuarios')
    .select('id, nombre, posada_id, sueldo_mensual_usd')
    .eq('rol', 'conserje')
    .eq('activo', true)
    .not('sueldo_mensual_usd', 'is', null)
    .gt('sueldo_mensual_usd', 0);
  if (errCons) return { error: errCons.message };
  if (!conserjes || conserjes.length === 0) {
    return { error: 'No hay conserjes activos con sueldo configurado.' };
  }

  // ¿Cuáles ya tienen una entrada de sueldo para este mes?
  const { data: existentes } = await admin
    .from('nomina')
    .select('usuario_id')
    .eq('periodo_inicio', primerDia)
    .eq('concepto', 'sueldo');
  const yaCreados = new Set((existentes ?? []).map((e) => e.usuario_id as string));

  const aCrear = conserjes
    .filter((c) => !yaCreados.has(c.id as string))
    .map((c) => ({
      usuario_id: c.id,
      posada_id: c.posada_id,
      periodo_inicio: primerDia,
      periodo_fin: ultimoDia,
      concepto: 'sueldo',
      monto_usd: c.sueldo_mensual_usd,
      estado: 'pendiente' as const,
    }));

  if (aCrear.length === 0) {
    return { ok: 'Todos los conserjes activos ya tienen sueldo registrado este mes.' };
  }

  const { error: errInsert } = await admin.from('nomina').insert(aCrear);
  if (errInsert) return { error: errInsert.message };

  revalidatePath('/admin/nomina');
  return { ok: `${aCrear.length} sueldos creados para ${d.data.mes}.` };
}

// =====================================================================
// Crear pago suelto (bono, aguinaldo, etc.)
// =====================================================================
const bonoSchema = z.object({
  usuario_id: z.string().uuid(),
  concepto: z.string().min(1).max(200),
  monto_usd: z.coerce.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function crearBono(
  _prev: EstadoNomina | null,
  formData: FormData,
): Promise<EstadoNomina> {
  await exigirRol(['dueno']);
  const d = bonoSchema.safeParse({
    usuario_id: formData.get('usuario_id'),
    concepto: formData.get('concepto'),
    monto_usd: formData.get('monto_usd'),
    fecha: formData.get('fecha'),
  });
  if (!d.success) return { error: d.error.issues[0]?.message ?? 'Datos inválidos.' };

  const admin = createAdminClient();
  const { data: u } = await admin.from('usuarios').select('posada_id').eq('id', d.data.usuario_id).maybeSingle();

  const { error } = await admin.from('nomina').insert({
    usuario_id: d.data.usuario_id,
    posada_id: u?.posada_id ?? null,
    periodo_inicio: d.data.fecha,
    periodo_fin: d.data.fecha,
    concepto: d.data.concepto,
    monto_usd: d.data.monto_usd,
    estado: 'pendiente',
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/nomina');
  return { ok: 'Bono / pago puntual creado.' };
}

// =====================================================================
// Marcar nómina como pagada / revertir
// =====================================================================
const pagarSchema = z.object({
  nomina_id: z.string().uuid(),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function marcarNominaPagada(
  _prev: EstadoNomina | null,
  formData: FormData,
): Promise<EstadoNomina> {
  await exigirRol(['dueno']);
  const d = pagarSchema.safeParse({
    nomina_id: formData.get('nomina_id'),
    fecha_pago: formData.get('fecha_pago'),
  });
  if (!d.success) return { error: 'Datos inválidos.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('nomina')
    .update({ estado: 'pagada', fecha_pago: d.data.fecha_pago })
    .eq('id', d.data.nomina_id);
  if (error) return { error: error.message };

  revalidatePath('/admin/nomina');
  return { ok: 'Pago de nómina registrado.' };
}

export async function revertirNominaPagada(
  _prev: EstadoNomina | null,
  formData: FormData,
): Promise<EstadoNomina> {
  await exigirRol(['dueno']);
  const id = z.string().uuid().safeParse(formData.get('nomina_id'));
  if (!id.success) return { error: 'ID inválido.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('nomina')
    .update({ estado: 'pendiente', fecha_pago: null })
    .eq('id', id.data);
  if (error) return { error: error.message };

  revalidatePath('/admin/nomina');
  return { ok: 'Pago revertido.' };
}
