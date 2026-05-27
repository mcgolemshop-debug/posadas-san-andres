-- =====================================================================
-- Migración 008 — Nómina
-- =====================================================================
-- Sueldos de conserjes y pagos recurrentes asociados a una posada.
-- Solo el Dueño puede modificar; Contador lee.
-- =====================================================================

CREATE TABLE public.nomina (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  posada_id       uuid REFERENCES public.posadas(id) ON DELETE SET NULL,
  periodo_inicio  date NOT NULL,
  periodo_fin     date NOT NULL,
  CHECK (periodo_fin >= periodo_inicio),
  concepto        text NOT NULL,                  -- 'sueldo', 'bono', 'aguinaldo', etc.
  monto_usd       numeric(10,2) NOT NULL CHECK (monto_usd >= 0),
  estado          text NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  fecha_pago      date,
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nomina_usuario ON public.nomina (usuario_id);
CREATE INDEX idx_nomina_posada ON public.nomina (posada_id);
CREATE INDEX idx_nomina_periodo ON public.nomina (periodo_inicio, periodo_fin);

CREATE TRIGGER nomina_set_updated_at
  BEFORE UPDATE ON public.nomina
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
