'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { exigirRol } from '@/lib/auth/session';

// =====================================================================
// Actualizar posada
// =====================================================================
const posadaSchema = z.object({
  posada_id: z.string().uuid(),
  nombre: z.string().min(1).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
});

export async function actualizarPosada(formData: FormData): Promise<void> {
  await exigirRol(['dueno']);
  const d = posadaSchema.parse({
    posada_id: formData.get('posada_id'),
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') || null,
  });
  const admin = createAdminClient();
  const { error } = await admin
    .from('posadas')
    .update({ nombre: d.nombre, descripcion: d.descripcion })
    .eq('id', d.posada_id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/posadas');
}

// =====================================================================
// Actualizar apartamento
// =====================================================================
const aptoSchema = z.object({
  apto_id: z.string().uuid(),
  nombre: z.string().min(1).max(200),
  caracteristica: z.enum(['piscina', 'garage', '']).optional().nullable(),
  capacidad: z.coerce.number().int().min(1).max(50),
});

export async function actualizarApartamento(formData: FormData): Promise<void> {
  await exigirRol(['dueno']);
  const d = aptoSchema.parse({
    apto_id: formData.get('apto_id'),
    nombre: formData.get('nombre'),
    caracteristica: formData.get('caracteristica') || null,
    capacidad: formData.get('capacidad'),
  });
  const admin = createAdminClient();
  const { error } = await admin
    .from('apartamentos')
    .update({
      nombre: d.nombre,
      caracteristica: d.caracteristica === '' ? null : d.caracteristica,
      capacidad: d.capacidad,
    })
    .eq('id', d.apto_id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/posadas');
}

// =====================================================================
// Crear / actualizar temporada
// =====================================================================
const temporadaSchema = z.object({
  temporada_id: z.string().uuid().optional().nullable(),
  nombre: z.string().min(1).max(200),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  prioridad: z.coerce.number().int().min(1).max(10),
  estadia_minima_noches: z.coerce.number().int().min(1).max(30),
  fuerza_completa_confort: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export async function guardarTemporada(formData: FormData): Promise<void> {
  await exigirRol(['dueno']);
  const d = temporadaSchema.parse({
    temporada_id: formData.get('temporada_id') || null,
    nombre: formData.get('nombre'),
    fecha_inicio: formData.get('fecha_inicio') || null,
    fecha_fin: formData.get('fecha_fin') || null,
    prioridad: formData.get('prioridad'),
    estadia_minima_noches: formData.get('estadia_minima_noches'),
    fuerza_completa_confort: formData.get('fuerza_completa_confort') ?? 'false',
  });
  const admin = createAdminClient();
  const datos = {
    nombre: d.nombre,
    fecha_inicio: d.fecha_inicio,
    fecha_fin: d.fecha_fin,
    prioridad: d.prioridad,
    estadia_minima_noches: d.estadia_minima_noches,
    fuerza_completa_confort: d.fuerza_completa_confort,
  };
  if (d.temporada_id) {
    const { error } = await admin.from('temporadas').update(datos).eq('id', d.temporada_id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from('temporadas').insert(datos);
    if (error) throw new Error(error.message);
  }
  revalidatePath('/admin/posadas');
}

// =====================================================================
// Eliminar temporada
// =====================================================================
const eliminarTemporadaSchema = z.object({ temporada_id: z.string().uuid() });

export async function eliminarTemporada(formData: FormData): Promise<void> {
  await exigirRol(['dueno']);
  const d = eliminarTemporadaSchema.parse({
    temporada_id: formData.get('temporada_id'),
  });
  const admin = createAdminClient();

  // No permitir borrar si hay precios o reservas asociadas
  const { count: preciosCount } = await admin
    .from('precios')
    .select('id', { count: 'exact', head: true })
    .eq('temporada_id', d.temporada_id);
  if ((preciosCount ?? 0) > 0) {
    throw new Error('No se puede eliminar: hay precios asociados a esta temporada. Bórralos primero.');
  }

  const { error } = await admin.from('temporadas').delete().eq('id', d.temporada_id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/posadas');
}

// =====================================================================
// Eliminar precio
// =====================================================================
const eliminarPrecioSchema = z.object({ precio_id: z.string().uuid() });

export async function eliminarPrecio(formData: FormData): Promise<void> {
  await exigirRol(['dueno']);
  const d = eliminarPrecioSchema.parse({
    precio_id: formData.get('precio_id'),
  });
  const admin = createAdminClient();
  const { error } = await admin.from('precios').delete().eq('id', d.precio_id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/posadas');
}

// =====================================================================
// Upsert precio
// =====================================================================
const precioSchema = z.object({
  posada_id: z.string().uuid(),
  temporada_id: z.string().uuid(),
  modalidad: z.enum(['apartamento', 'completa']),
  num_personas: z.coerce.number().int().min(1).max(50).optional().nullable(),
  precio_usd: z.coerce.number().min(0),
});

export async function upsertPrecio(formData: FormData): Promise<void> {
  await exigirRol(['dueno']);
  const npRaw = formData.get('num_personas');
  const d = precioSchema.parse({
    posada_id: formData.get('posada_id'),
    temporada_id: formData.get('temporada_id'),
    modalidad: formData.get('modalidad'),
    num_personas: npRaw && npRaw !== '' ? npRaw : null,
    precio_usd: formData.get('precio_usd'),
  });
  const admin = createAdminClient();
  const { error } = await admin
    .from('precios')
    .upsert(
      {
        posada_id: d.posada_id,
        temporada_id: d.temporada_id,
        modalidad: d.modalidad,
        num_personas: d.num_personas ?? null,
        precio_usd: d.precio_usd,
        activo: true,
      },
      { onConflict: 'posada_id,temporada_id,modalidad,num_personas' },
    );
  if (error) throw new Error(error.message);
  revalidatePath('/admin/posadas');
}
