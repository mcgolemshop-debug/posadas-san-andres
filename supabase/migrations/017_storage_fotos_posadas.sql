-- =====================================================================
-- Migración 017 — Storage de fotos de posadas
-- =====================================================================
-- Bucket PÚBLICO "fotos-posadas" para fotos que se ven en el sitio.
-- Solo el Dueño puede subir/borrar; cualquiera puede leer (público).
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos-posadas',
  'fotos-posadas',
  true,  -- PÚBLICO: las fotos las ve cualquier visitante del sitio
  5242880,  -- 5 MB max por foto
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- INSERT: solo dueno puede subir
DROP POLICY IF EXISTS fotos_posadas_upload ON storage.objects;
CREATE POLICY fotos_posadas_upload ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-posadas'
    AND public.user_rol() = 'dueno'
  );

-- SELECT: cualquiera lee (bucket es público igual, esto es redundante pero explícito)
DROP POLICY IF EXISTS fotos_posadas_read ON storage.objects;
CREATE POLICY fotos_posadas_read ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'fotos-posadas');

-- DELETE: solo dueno
DROP POLICY IF EXISTS fotos_posadas_delete ON storage.objects;
CREATE POLICY fotos_posadas_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-posadas'
    AND public.user_rol() = 'dueno'
  );
