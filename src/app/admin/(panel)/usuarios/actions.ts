'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { exigirRol } from '@/lib/auth/session';

export interface EstadoUsuarios {
  error?: string;
  ok?: string;
}

const ROLES = ['dueno', 'conserje', 'vulcanos', 'contador'] as const;

const crearSchema = z
  .object({
    email: z.string().email('Email inválido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    nombre: z.string().min(1, 'Nombre requerido.').max(200),
    telefono: z.string().max(50).optional().nullable(),
    rol: z.enum(ROLES),
    posada_id: z.string().uuid().optional().nullable(),
  })
  .refine(
    (d) => d.rol !== 'conserje' || (d.posada_id && d.posada_id.length > 0),
    { message: 'Un conserje debe tener posada asignada.', path: ['posada_id'] },
  );

export async function crearUsuario(
  _prev: EstadoUsuarios | null,
  formData: FormData,
): Promise<EstadoUsuarios> {
  await exigirRol(['dueno']);

  const datos = crearSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    nombre: formData.get('nombre'),
    telefono: formData.get('telefono') || null,
    rol: formData.get('rol'),
    posada_id: formData.get('posada_id') || null,
  });
  if (!datos.success) {
    return { error: datos.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const admin = createAdminClient();

  // 1) Crear usuario en auth.users
  const { data: created, error: errAuth } = await admin.auth.admin.createUser({
    email: datos.data.email,
    password: datos.data.password,
    email_confirm: true,
  });
  if (errAuth || !created?.user) {
    return { error: `No pude crear el usuario: ${errAuth?.message ?? 'desconocido'}` };
  }

  // 2) Insertar perfil en public.usuarios
  const { error: errPerfil } = await admin.from('usuarios').insert({
    id: created.user.id,
    email: datos.data.email,
    nombre: datos.data.nombre,
    telefono: datos.data.telefono ?? null,
    rol: datos.data.rol,
    posada_id: datos.data.posada_id ?? null,
    activo: true,
  });
  if (errPerfil) {
    // Rollback: borrar el usuario de auth para no dejar huérfanos
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `No pude crear el perfil: ${errPerfil.message}` };
  }

  revalidatePath('/admin/usuarios');
  return { ok: `Usuario ${datos.data.email} creado correctamente.` };
}

const toggleSchema = z.object({
  usuario_id: z.string().uuid(),
  activo: z.enum(['true', 'false']),
});

export async function toggleActivoUsuario(
  _prev: EstadoUsuarios | null,
  formData: FormData,
): Promise<EstadoUsuarios> {
  const sesion = await exigirRol(['dueno']);

  const d = toggleSchema.safeParse({
    usuario_id: formData.get('usuario_id'),
    activo: formData.get('activo'),
  });
  if (!d.success) return { error: 'Datos inválidos.' };

  // No permitir auto-desactivarse
  if (d.data.usuario_id === sesion.user_id && d.data.activo === 'false') {
    return { error: 'No puedes desactivar tu propio usuario.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('usuarios')
    .update({ activo: d.data.activo === 'true' })
    .eq('id', d.data.usuario_id);
  if (error) return { error: error.message };

  revalidatePath('/admin/usuarios');
  return { ok: d.data.activo === 'true' ? 'Usuario activado.' : 'Usuario desactivado.' };
}
