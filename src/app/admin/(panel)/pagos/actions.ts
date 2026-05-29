'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { exigirRol } from '@/lib/auth/session';

export interface EstadoPago {
  error?: string;
  ok?: string;
}

const CANALES = ['zelle', 'binance', 'banco_panama', 'banco_venezuela', 'efectivo'] as const;

const schema = z.object({
  reserva_id: z.string().uuid(),
  canal: z.enum(CANALES),
  monto_bruto_usd: z.coerce.number().positive('El monto debe ser mayor a 0.'),
  comision_retenida_usd: z.coerce.number().min(0).default(0),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notas: z.string().max(500).optional().nullable(),
});

export async function registrarPago(
  _prev: EstadoPago | null,
  formData: FormData,
): Promise<EstadoPago> {
  const sesion = await exigirRol(['dueno']);
  const d = schema.safeParse({
    reserva_id: formData.get('reserva_id'),
    canal: formData.get('canal'),
    monto_bruto_usd: formData.get('monto_bruto_usd'),
    comision_retenida_usd: formData.get('comision_retenida_usd') || 0,
    fecha_pago: formData.get('fecha_pago'),
    notas: formData.get('notas') || null,
  });
  if (!d.success) {
    return { error: d.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  if (d.data.comision_retenida_usd > d.data.monto_bruto_usd) {
    return { error: 'La comisión retenida no puede ser mayor al monto bruto.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('pagos').insert({
    reserva_id: d.data.reserva_id,
    canal: d.data.canal,
    monto_bruto_usd: d.data.monto_bruto_usd,
    comision_retenida_usd: d.data.comision_retenida_usd,
    fecha_pago: d.data.fecha_pago,
    notas: d.data.notas,
    registrado_por: sesion.user_id,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/pagos');
  return { ok: 'Pago registrado.' };
}
