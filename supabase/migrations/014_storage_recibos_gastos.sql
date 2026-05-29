-- =====================================================================
-- Migración 014 — Storage de recibos de gastos
-- =====================================================================
-- Bucket privado "recibos-gastos" para fotos/PDFs de los recibos que
-- el conserje o dueño suben al registrar un gasto operativo.
-- Mismas reglas de acceso que comprobantes-pago.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recibos-gastos',
  'recibos-gastos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- INSERT: conserje y dueno pueden subir
DROP POLICY IF EXISTS recibos_admin_upload ON storage.objects;
CREATE POLICY recibos_admin_upload ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recibos-gastos'
    AND public.user_rol() IN ('dueno', 'conserje')
  );

-- SELECT: roles administrativos pueden leer
DROP POLICY IF EXISTS recibos_admin_read ON storage.objects;
CREATE POLICY recibos_admin_read ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recibos-gastos'
    AND public.user_rol() IN ('dueno', 'conserje', 'contador')
  );

-- DELETE: solo dueno
DROP POLICY IF EXISTS recibos_dueno_delete ON storage.objects;
CREATE POLICY recibos_dueno_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recibos-gastos'
    AND public.user_rol() = 'dueno'
  );
