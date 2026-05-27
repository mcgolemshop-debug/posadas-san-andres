-- =====================================================================
-- Migración 007 — Comisiones
-- =====================================================================
-- Comisión del 10% a un solo beneficiario por reserva (Vulcanos o
-- conserje). Nace 'pendiente' y se marca 'pagada' al cancelarse.
-- =====================================================================

CREATE TABLE public.comisiones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Una reserva = a lo sumo una comisión
  reserva_id      uuid NOT NULL UNIQUE REFERENCES public.reservas(id) ON DELETE CASCADE,
  beneficiario_id uuid NOT NULL REFERENCES public.usuarios(id),
  porcentaje      numeric(5,2) NOT NULL DEFAULT 10.00 CHECK (porcentaje >= 0 AND porcentaje <= 100),
  monto_usd       numeric(10,2) NOT NULL CHECK (monto_usd >= 0),
  estado          text NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  fecha_pago      date,
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comisiones_beneficiario_estado ON public.comisiones (beneficiario_id, estado);
CREATE INDEX idx_comisiones_reserva ON public.comisiones (reserva_id);

CREATE TRIGGER comisiones_set_updated_at
  BEFORE UPDATE ON public.comisiones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
