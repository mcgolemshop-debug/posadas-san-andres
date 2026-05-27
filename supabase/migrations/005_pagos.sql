-- =====================================================================
-- Migración 005 — Pagos
-- =====================================================================
-- Registro de cada pago recibido por una reserva. Una reserva puede
-- tener varios pagos (señal + saldo). Cada pago tiene su canal y un
-- comprobante opcional.
-- =====================================================================

CREATE TABLE public.pagos (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id             uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  canal                  text NOT NULL
                         CHECK (canal IN ('zelle', 'binance', 'banco_panama', 'banco_venezuela', 'efectivo')),
  monto_bruto_usd        numeric(10,2) NOT NULL CHECK (monto_bruto_usd >= 0),
  comision_retenida_usd  numeric(10,2) NOT NULL DEFAULT 0 CHECK (comision_retenida_usd >= 0),
  -- Calculado automáticamente: lo que llega al Dueño después de descontar comisión.
  monto_neto_usd         numeric(10,2) GENERATED ALWAYS AS (monto_bruto_usd - comision_retenida_usd) STORED,
  comprobante_url        text,  -- URL en Supabase Storage
  fecha_pago             date NOT NULL,
  notas                  text,
  registrado_por         uuid REFERENCES public.usuarios(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_reserva ON public.pagos (reserva_id);
CREATE INDEX idx_pagos_canal ON public.pagos (canal);
CREATE INDEX idx_pagos_fecha ON public.pagos (fecha_pago);
