// Helpers para construir URLs públicas de fotos del bucket fotos-posadas.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/**
 * Devuelve la URL pública de un archivo en el bucket fotos-posadas.
 * Pasa la ruta relativa al bucket (sin slash inicial).
 */
export function urlFotoPosada(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path; // ya es URL absoluta
  return `${SUPABASE_URL}/storage/v1/object/public/fotos-posadas/${path}`;
}
