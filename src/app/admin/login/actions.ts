'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface EstadoLogin {
  error?: string;
}

const schema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'Contraseña requerida.'),
  next: z.string().optional(),
});

export async function iniciarSesion(
  _prev: EstadoLogin | null,
  formData: FormData,
): Promise<EstadoLogin> {
  const datos = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') || undefined,
  });

  if (!datos.success) {
    return { error: datos.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: datos.data.email,
    password: datos.data.password,
  });

  if (error) {
    // No exponer si el problema fue email o contraseña, por seguridad
    return { error: 'Email o contraseña incorrectos.' };
  }

  // Verificar que el usuario tenga perfil activo en public.usuarios
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('activo')
      .eq('id', user.id)
      .maybeSingle();
    if (!perfil || !perfil.activo) {
      await supabase.auth.signOut();
      return { error: 'Tu cuenta no tiene acceso al panel administrativo.' };
    }
  }

  // Redirigir al dashboard (o a "next" si venía de una ruta protegida)
  const destino =
    datos.data.next && datos.data.next.startsWith('/admin') ? datos.data.next : '/admin';
  redirect(destino);
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
