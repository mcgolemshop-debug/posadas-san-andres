import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente Supabase para usar en Server Components, Server Actions y
 * Route Handlers. Lee y escribe cookies via la API de Next.js para
 * mantener viva la sesión del usuario.
 *
 * En Next.js 16 cookies() es async, por eso esta función también lo es.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll puede fallar en Server Components que solo leen.
            // Si el middleware está bien configurado, la sesión se
            // refresca allá y este catch es seguro de ignorar.
          }
        },
      },
    },
  );
}
