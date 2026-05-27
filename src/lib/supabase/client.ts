import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para usar en componentes que corren en el navegador
 * (los marcados con 'use client'). Lee sesión desde cookies del browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
