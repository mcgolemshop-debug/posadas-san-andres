// =====================================================================
// Middleware Next.js: refresca la sesión de Supabase en cada request
// y protege las rutas /admin/*.
// =====================================================================
// Patrón oficial de @supabase/ssr para App Router:
//   https://supabase.com/docs/guides/auth/server-side/nextjs
//
// Reglas:
//   - /admin/login es público (necesario para entrar)
//   - cualquier otro /admin/* requiere sesión; si no, redirigir a login
//   - el matcher excluye assets estáticos para no costar latencia inútil
// =====================================================================

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Importante: createServerClient debe ir ANTES de cualquier lógica que
  // dependa del usuario. Y NO debe haber código entre createServerClient
  // y supabase.auth.getUser() (so el refresh de cookies funciona bien).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esRutaAdmin = path.startsWith('/admin');
  const esLogin = path === '/admin/login';

  // Si NO está logueado y quiere entrar a /admin (excepto login) → al login
  if (esRutaAdmin && !esLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Si está logueado y va al login → al dashboard
  if (esLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Aplicamos en todo excepto: assets de Next y archivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
