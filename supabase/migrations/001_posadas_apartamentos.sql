-- =====================================================================
-- Migración 001 — Posadas y apartamentos
-- =====================================================================
-- Crea las tablas base de las 2 posadas (San Andrés Confort y Beach)
-- y los 4 apartamentos individuales de Confort.
-- =====================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- para EXCLUSION con gist

-- ---------------------------------------------------------------------
-- Tabla: posadas
-- ---------------------------------------------------------------------
CREATE TABLE public.posadas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,            -- 'confort' | 'beach'
  nombre       text NOT NULL,
  descripcion  text,
  -- 'individual_y_completa' = Confort. 'solo_completa' = Beach.
  tipo_alquiler text NOT NULL CHECK (tipo_alquiler IN ('individual_y_completa', 'solo_completa')),
  foto_portada text,
  galeria_urls text[] NOT NULL DEFAULT '{}',
  activa       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabla: apartamentos
-- ---------------------------------------------------------------------
CREATE TABLE public.apartamentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id       uuid NOT NULL REFERENCES public.posadas(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  caracteristica  text,         -- 'piscina' | 'garage' | NULL
  capacidad       int,          -- máximo de huéspedes; pendiente de definir
  orden           int NOT NULL DEFAULT 0,
  foto_portada    text,
  galeria_urls    text[] NOT NULL DEFAULT '{}',
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (posada_id, nombre)
);

CREATE INDEX idx_apartamentos_posada ON public.apartamentos (posada_id);

-- ---------------------------------------------------------------------
-- Trigger para mantener updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posadas_set_updated_at
  BEFORE UPDATE ON public.posadas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER apartamentos_set_updated_at
  BEFORE UPDATE ON public.apartamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
