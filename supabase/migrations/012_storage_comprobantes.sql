-- =====================================================================
-- Migración 012 — Storage de comprobantes de pago
-- =====================================================================
-- 1) Agrega columna `comprobante_pago_url` a `reservas` (URL del archivo
--    subido por el cliente al hacer la solicitud).
-- 2) Crea el bucket privado "comprobantes-pago" en Supabase Storage.
-- 3) Políticas RLS:
--    - anon puede SUBIR (INSERT) comprobantes (necesario para el form público)
--    - dueno, conserje (su posada), vulcanos (sus reservas), contador
--      pueden VER (SELECT) los archivos
--    - solo dueno puede borrar (DELETE)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Columna nueva en reservas
-- ---------------------------------------------------------------------
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS comprobante_pago_url text;

COMMENT ON COLUMN public.reservas.comprobante_pago_url IS
  'URL en Storage del comprobante de pago subido por el cliente al solicitar la reserva. Obligatorio según decisión de Orlando (28 may 2026).';

-- ---------------------------------------------------------------------
-- 2) Crear bucket de Storage
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes-pago',
  'comprobantes-pago',
  false,  -- privado: solo accesible vía URLs firmadas o por usuarios con permiso
  10485760,  -- 10 MB máximo por archivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 3) Políticas RLS en storage.objects
-- ---------------------------------------------------------------------

-- INSERT: cualquiera (anon o authenticated) puede subir al bucket
DROP POLICY IF EXISTS comprobantes_anon_upload ON storage.objects;
CREATE POLICY comprobantes_anon_upload ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'comprobantes-pago');

-- SELECT: solo roles administrativos pueden leer
DROP POLICY IF EXISTS comprobantes_admin_read ON storage.objects;
CREATE POLICY comprobantes_admin_read ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comprobantes-pago'
    AND public.user_rol() IN ('dueno', 'conserje', 'vulcanos', 'contador')
  );

-- DELETE: solo dueno
DROP POLICY IF EXISTS comprobantes_dueno_delete ON storage.objects;
CREATE POLICY comprobantes_dueno_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comprobantes-pago'
    AND public.user_rol() = 'dueno'
  );
