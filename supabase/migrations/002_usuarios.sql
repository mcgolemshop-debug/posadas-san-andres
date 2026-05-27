-- =====================================================================
-- Migración 002 — Usuarios
-- =====================================================================
-- Extiende auth.users con rol y posada asignada (cuando aplique).
-- Los 4 roles son: dueno, conserje, vulcanos, contador.
-- =====================================================================

CREATE TABLE public.usuarios (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  nombre      text NOT NULL,
  telefono    text,
  rol         text NOT NULL CHECK (rol IN ('dueno', 'conserje', 'vulcanos', 'contador')),
  -- Solo se llena cuando rol='conserje' (un conserje pertenece a una posada)
  posada_id   uuid REFERENCES public.posadas(id) ON DELETE SET NULL,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Si es conserje, tiene que tener posada
  CONSTRAINT conserje_tiene_posada CHECK (
    rol != 'conserje' OR posada_id IS NOT NULL
  )
);

CREATE INDEX idx_usuarios_rol ON public.usuarios (rol);
CREATE INDEX idx_usuarios_posada ON public.usuarios (posada_id);

CREATE TRIGGER usuarios_set_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Helpers para usar en políticas RLS de otras tablas
-- ---------------------------------------------------------------------

-- Devuelve el rol del usuario logueado, o NULL si no hay sesión
CREATE OR REPLACE FUNCTION public.user_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- Devuelve la posada asignada del usuario logueado (solo aplica a conserjes)
CREATE OR REPLACE FUNCTION public.user_posada_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT posada_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.user_rol() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_posada_id() TO authenticated, anon;
