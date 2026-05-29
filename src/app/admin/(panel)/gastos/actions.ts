'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSesionAdminEstricto } from '@/lib/auth/session';

export interface EstadoGasto {
  error?: string;
  ok?: string;
}

const CATEGORIAS = ['electrico', 'aires', 'iluminacion', 'pintura', 'seguridad', 'reparaciones', 'otros'] as const;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const TAMANO_MAX_BYTES = 10 * 1024 * 1024;

const schema = z.object({
  posada_id: z.string().uuid(),
  categoria: z.enum(CATEGORIAS),
  descripcion: z.string().min(1).max(500),
  monto_usd: z.coerce.number().positive('El monto debe ser mayor a 0.'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function crearGasto(
  _prev: EstadoGasto | null,
  formData: FormData,
): Promise<EstadoGasto> {
  const sesion = await getSesionAdminEstricto();
  if (!['dueno', 'conserje'].includes(sesion.perfil.rol)) {
    return { error: 'Tu rol no puede registrar gastos.' };
  }

  const datos = schema.safeParse({
    posada_id: formData.get('posada_id'),
    categoria: formData.get('categoria'),
    descripcion: formData.get('descripcion'),
    monto_usd: formData.get('monto_usd'),
    fecha: formData.get('fecha'),
  });
  if (!datos.success) {
    return { error: datos.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  // Conserje solo puede registrar en su posada
  if (sesion.perfil.rol === 'conserje' && datos.data.posada_id !== sesion.perfil.posada_id) {
    return { error: 'Solo puedes registrar gastos de tu posada asignada.' };
  }

  // Recibo opcional
  let recibo_url: string | null = null;
  const recibo = formData.get('recibo') as File | null;
  if (recibo && recibo.size > 0) {
    if (recibo.size > TAMANO_MAX_BYTES) {
      return { error: 'El recibo supera los 10 MB.' };
    }
    if (!TIPOS_PERMITIDOS.includes(recibo.type)) {
      return { error: 'Formato de recibo no permitido (usa JPG/PNG/PDF).' };
    }

    const admin = createAdminClient();
    const ext = (recibo.name.split('.').pop() || 'bin').toLowerCase();
    const nombreArchivo = `${datos.data.posada_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const buffer = await recibo.arrayBuffer();
    const { error: errUpload } = await admin.storage
      .from('recibos-gastos')
      .upload(nombreArchivo, buffer, { contentType: recibo.type });
    if (errUpload) return { error: `No pude subir el recibo: ${errUpload.message}` };
    recibo_url = nombreArchivo;
  }

  const admin = createAdminClient();
  const { error } = await admin.from('gastos').insert({
    posada_id: datos.data.posada_id,
    categoria: datos.data.categoria,
    descripcion: datos.data.descripcion,
    monto_usd: datos.data.monto_usd,
    fecha: datos.data.fecha,
    recibo_url,
    registrado_por: sesion.user_id,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/gastos');
  return { ok: 'Gasto registrado.' };
}
