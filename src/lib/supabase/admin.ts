import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con privilegios de service_role.
 *
 * IMPORTANTE: este cliente **SALTA** todas las políticas de Row Level Security.
 * NUNCA lo importes en código que corra en el navegador. Úsalo solo en:
 *   - Server Actions de muy alta confianza
 *   - Route Handlers que requieren operaciones administrativas
 *   - Scripts seed
 *
 * Si la SUPABASE_SERVICE_ROLE_KEY se filtra, cualquiera podría leer
 * y modificar TODA la base de datos.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
