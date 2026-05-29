'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { exigirRol } from '@/lib/auth/session';

export interface EstadoComision {
  error?: string;
  ok?: string;
}

const pagarSchema = z.object({
  comision_id: z.string().uuid(),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function marcarComisionPagada(
  _prev: EstadoComision | null,
  formData: FormData,
): Promise<EstadoComision> {
  await exigirRol(['dueno']);
  const d = pagarSchema.safeParse({
    comision_id: formData.get('comision_id'),
    fecha_pago: formData.get('fecha_pago'),
  });
  if (!d.success) return { error: 'Datos inválidos.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('comisiones')
    .update({ estado: 'pagada', fecha_pago: d.data.fecha_pago })
    .eq('id', d.data.comision_id);
  if (error) return { error: error.message };

  revalidatePath('/admin/comisiones');
  return { ok: 'Comisión marcada como pagada.' };
}

export async function revertirComisionPagada(
  _prev: EstadoComision | null,
  formData: FormData,
): Promise<EstadoComision> {
  await exigirRol(['dueno']);
  const id = z.string().uuid().safeParse(formData.get('comision_id'));
  if (!id.success) return { error: 'ID inválido.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('comisiones')
    .update({ estado: 'pendiente', fecha_pago: null })
    .eq('id', id.data);
  if (error) return { error: error.message };

  revalidatePath('/admin/comisiones');
  return { ok: 'Pago revertido.' };
}
