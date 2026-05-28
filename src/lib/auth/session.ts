// =====================================================================
// Helper de sesión admin
// =====================================================================
// Centraliza la lógica de "¿quién está logueado y qué rol tiene?".
// Cualquier Server Component o Server Action dentro de /admin debe usar
// getSesionAdmin() o getSesionAdminEstricto() en vez de manejar la
// sesión a pelo.
// =====================================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type RolUsuario = 'dueno' | 'conserje' | 'vulcanos' | 'contador';

export interface PerfilAdmin {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  posada_id: string | null;
  activo: boolean;
}

export interface SesionAdmin {
  /** UUID del usuario en auth.users */
  user_id: string;
  email: string;
  perfil: PerfilAdmin;
}

/**
 * Devuelve la sesión si el usuario está autenticado Y tiene perfil activo
 * en public.usuarios. Devuelve null si no.
 *
 * Útil cuando quieres mostrar contenido distinto según haya sesión o no
 * sin redirigir.
 */
export async function getSesionAdmin(): Promise<SesionAdmin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil, error } = await supabase
    .from('usuarios')
    .select('id, email, nombre, rol, posada_id, activo')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !perfil) return null;
  if (!perfil.activo) return null;

  return {
    user_id: user.id,
    email: user.email ?? perfil.email,
    perfil: perfil as PerfilAdmin,
  };
}

/**
 * Versión que REDIRIGE al login si no hay sesión.
 * Úsala en páginas dentro de /admin que requieren autenticación
 * (todas excepto /admin/login).
 */
export async function getSesionAdminEstricto(): Promise<SesionAdmin> {
  const sesion = await getSesionAdmin();
  if (!sesion) redirect('/admin/login');
  return sesion;
}

/**
 * Igual que getSesionAdminEstricto pero además exige uno de los roles
 * permitidos. Si el rol no aplica, redirige a /admin (donde el dashboard
 * adaptativo mostrará lo que sí puede ver).
 */
export async function exigirRol(rolesPermitidos: RolUsuario[]): Promise<SesionAdmin> {
  const sesion = await getSesionAdminEstricto();
  if (!rolesPermitidos.includes(sesion.perfil.rol)) {
    redirect('/admin');
  }
  return sesion;
}
