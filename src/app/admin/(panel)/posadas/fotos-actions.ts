'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { exigirRol } from '@/lib/auth/session';

export interface EstadoFoto {
  error?: string;
  ok?: string;
}

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Sube una foto al bucket fotos-posadas. Asocia a una posada o apartamento.
 * Si esTuPortada=true, la marca como foto_portada. Si no, la añade a galeria_urls.
 */
export async function subirFotoPosada(
  _prev: EstadoFoto | null,
  formData: FormData,
): Promise<EstadoFoto> {
  await exigirRol(['dueno']);

  const tipo = z.enum(['posada', 'apartamento']).safeParse(formData.get('tipo'));
  const targetId = z.string().uuid().safeParse(formData.get('target_id'));
  const esPortada = formData.get('es_portada') === 'true';
  if (!tipo.success || !targetId.success) return { error: 'Datos inválidos.' };

  const file = formData.get('foto') as File | null;
  if (!file || file.size === 0) return { error: 'Selecciona una foto.' };
  if (file.size > MAX_BYTES) return { error: 'La foto supera los 5 MB.' };
  if (!TIPOS.includes(file.type)) return { error: 'Formato no permitido (JPG, PNG o WebP).' };

  const admin = createAdminClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const nombreArchivo = `${tipo.data}/${targetId.data}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: errUp } = await admin.storage
    .from('fotos-posadas')
    .upload(nombreArchivo, buffer, { contentType: file.type, cacheControl: '86400' });
  if (errUp) return { error: errUp.message };

  // Actualizar el registro
  const tabla = tipo.data === 'posada' ? 'posadas' : 'apartamentos';

  if (esPortada) {
    const { error } = await admin.from(tabla).update({ foto_portada: nombreArchivo }).eq('id', targetId.data);
    if (error) return { error: error.message };
  } else {
    // Append a galeria_urls
    const { data: actual } = await admin.from(tabla).select('galeria_urls').eq('id', targetId.data).maybeSingle();
    const previas = (actual?.galeria_urls as string[] | null) ?? [];
    const { error } = await admin.from(tabla).update({ galeria_urls: [...previas, nombreArchivo] }).eq('id', targetId.data);
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/posadas');
  revalidatePath('/');
  revalidatePath('/posada/confort');
  revalidatePath('/posada/beach');
  return { ok: 'Foto subida.' };
}

/**
 * Elimina una foto del bucket y la quita de la tabla.
 */
export async function eliminarFotoPosada(
  _prev: EstadoFoto | null,
  formData: FormData,
): Promise<EstadoFoto> {
  await exigirRol(['dueno']);

  const tipo = z.enum(['posada', 'apartamento']).safeParse(formData.get('tipo'));
  const targetId = z.string().uuid().safeParse(formData.get('target_id'));
  const path = z.string().min(1).safeParse(formData.get('path'));
  const esPortada = formData.get('es_portada') === 'true';
  if (!tipo.success || !targetId.success || !path.success) return { error: 'Datos inválidos.' };

  const admin = createAdminClient();
  const tabla = tipo.data === 'posada' ? 'posadas' : 'apartamentos';

  // Quitar de la tabla
  if (esPortada) {
    await admin.from(tabla).update({ foto_portada: null }).eq('id', targetId.data);
  } else {
    const { data: actual } = await admin.from(tabla).select('galeria_urls').eq('id', targetId.data).maybeSingle();
    const previas = (actual?.galeria_urls as string[] | null) ?? [];
    const nuevas = previas.filter((p) => p !== path.data);
    await admin.from(tabla).update({ galeria_urls: nuevas }).eq('id', targetId.data);
  }

  // Borrar del bucket
  await admin.storage.from('fotos-posadas').remove([path.data]);

  revalidatePath('/admin/posadas');
  revalidatePath('/');
  revalidatePath('/posada/confort');
  revalidatePath('/posada/beach');
  return { ok: 'Foto eliminada.' };
}
