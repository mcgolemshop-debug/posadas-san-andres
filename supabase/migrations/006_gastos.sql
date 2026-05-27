-- =====================================================================
-- Migración 006 — Gastos
-- =====================================================================
-- Gastos operativos de cada posada. Categorías predefinidas según
-- la especificación.
-- =====================================================================

CREATE TABLE public.gastos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id       uuid NOT NULL REFERENCES public.posadas(id) ON DELETE RESTRICT,
  categoria       text NOT NULL
                  CHECK (categoria IN (
                    'electrico',
                    'aires',
                    'iluminacion',
                    'pintura',
                    'seguridad',
                    'reparaciones',
                    'otros'
                  )),
  descripcion     text NOT NULL,
  monto_usd       numeric(10,2) NOT NULL CHECK (monto_usd > 0),
  fecha           date NOT NULL,
  recibo_url      text,
  registrado_por  uuid REFERENCES public.usuarios(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gastos_posada_fecha ON public.gastos (posada_id, fecha DESC);
CREATE INDEX idx_gastos_categoria ON public.gastos (categoria);

CREATE TRIGGER gastos_set_updated_at
  BEFORE UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
