-- =====================================================================
-- Migración 003 — Temporadas y precios
-- =====================================================================
-- Temporadas: Baja (default), Alta (1 ago-30 sep), Navidad 1 (21-29 dic),
-- Navidad 2 (30 dic-10 ene), Semana Santa (variable).
--
-- Precios: por posada × temporada × modalidad × num_personas (Beach baja).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: temporadas
-- ---------------------------------------------------------------------
CREATE TABLE public.temporadas (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                 text NOT NULL,
  descripcion            text,
  -- Rango de fechas. NULL/NULL = "default" (temporada baja).
  fecha_inicio           date,
  fecha_fin              date,
  -- Mayor número = mayor prioridad cuando una fecha cae en varias.
  -- Baja=1, Alta=2, Navidad/SS=3.
  prioridad              int NOT NULL CHECK (prioridad >= 1),
  estadia_minima_noches  int NOT NULL DEFAULT 1 CHECK (estadia_minima_noches >= 1),
  -- En Confort, si activa, esta temporada fuerza modalidad=completa.
  fuerza_completa_confort boolean NOT NULL DEFAULT false,
  activa                 boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (fecha_inicio IS NULL AND fecha_fin IS NULL) OR
    (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND fecha_fin >= fecha_inicio)
  )
);

CREATE INDEX idx_temporadas_fechas ON public.temporadas (fecha_inicio, fecha_fin) WHERE activa;
CREATE INDEX idx_temporadas_prioridad ON public.temporadas (prioridad DESC) WHERE activa;

CREATE TRIGGER temporadas_set_updated_at
  BEFORE UPDATE ON public.temporadas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Tabla: precios
-- ---------------------------------------------------------------------
-- Estructura: una fila por combinación posada × temporada × modalidad × num_personas
-- num_personas es relevante para Beach baja (12, 16, 20); en otros casos es NULL.
CREATE TABLE public.precios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id     uuid NOT NULL REFERENCES public.posadas(id) ON DELETE CASCADE,
  temporada_id  uuid NOT NULL REFERENCES public.temporadas(id) ON DELETE RESTRICT,
  modalidad     text NOT NULL CHECK (modalidad IN ('apartamento', 'completa')),
  num_personas  int,
  precio_usd    numeric(10,2) NOT NULL CHECK (precio_usd >= 0),
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Unicidad: una tarifa por combinación (Postgres 15+ permite NULLS NOT DISTINCT)
ALTER TABLE public.precios
  ADD CONSTRAINT precios_unicidad
  UNIQUE NULLS NOT DISTINCT (posada_id, temporada_id, modalidad, num_personas);

CREATE INDEX idx_precios_posada_temp ON public.precios (posada_id, temporada_id) WHERE activo;

CREATE TRIGGER precios_set_updated_at
  BEFORE UPDATE ON public.precios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
