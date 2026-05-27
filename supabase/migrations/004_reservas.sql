-- =====================================================================
-- Migración 004 — Reservas + trigger anti-solape
-- =====================================================================
-- Corazón del sistema. Toda reserva nace en estado 'pendiente'.
-- Solo Dueño y Vulcanos pueden confirmarla.
-- Un trigger impide que existan dos reservas CONFIRMADAS solapadas
-- en el mismo apartamento, y también previene mezclar "completa" con
-- cualquier apartamento individual en la misma posada.
-- =====================================================================

CREATE TABLE public.reservas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id          uuid NOT NULL REFERENCES public.posadas(id),
  apartamento_id     uuid REFERENCES public.apartamentos(id),  -- NULL si modalidad='completa'
  modalidad          text NOT NULL CHECK (modalidad IN ('apartamento', 'completa')),

  -- Fechas: convención hotelera. La noche del check-out NO se cobra.
  fecha_inicio       date NOT NULL,  -- check-in
  fecha_fin          date NOT NULL,  -- check-out
  CHECK (fecha_fin > fecha_inicio),

  -- Datos del cliente
  cliente_nombre     text NOT NULL,
  cliente_telefono   text NOT NULL,
  cliente_email      text NOT NULL,
  num_personas       int NOT NULL CHECK (num_personas > 0),

  -- Estado: pendiente -> confirmada/rechazada/cancelada
  estado             text NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'confirmada', 'rechazada', 'cancelada')),

  -- Precio calculado al momento de crear la reserva (USD)
  total_usd          numeric(10,2) NOT NULL CHECK (total_usd >= 0),
  -- Desglose noche por noche: [{fecha:'2026-08-01', temporada:'alta', precio:200}, ...]
  desglose_precio    jsonb,

  -- Quién gestionó la reserva (Vulcanos o conserje). NULL = directo del Dueño.
  gestor_id          uuid REFERENCES public.usuarios(id),
  motivo_rechazo     text,
  notas              text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  confirmada_at      timestamptz,
  cancelada_at       timestamptz,

  -- Si modalidad='apartamento' debe haber apartamento_id; si 'completa' no.
  CONSTRAINT modalidad_consistente CHECK (
    (modalidad = 'apartamento' AND apartamento_id IS NOT NULL) OR
    (modalidad = 'completa' AND apartamento_id IS NULL)
  )
);

CREATE INDEX idx_reservas_posada_estado ON public.reservas (posada_id, estado);
CREATE INDEX idx_reservas_apartamento_fechas ON public.reservas (apartamento_id, fecha_inicio, fecha_fin) WHERE estado = 'confirmada';
CREATE INDEX idx_reservas_posada_fechas ON public.reservas (posada_id, fecha_inicio, fecha_fin) WHERE estado = 'confirmada';
CREATE INDEX idx_reservas_gestor ON public.reservas (gestor_id);
CREATE INDEX idx_reservas_estado ON public.reservas (estado);

CREATE TRIGGER reservas_set_updated_at
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Trigger anti-solape
-- ---------------------------------------------------------------------
-- Reglas:
--   1. Solo aplica a reservas CONFIRMADAS (las pendientes pueden solaparse).
--   2. Mismo apartamento: no puede haber dos confirmadas con fechas solapadas.
--   3. En Confort: una completa bloquea todos los individuales y viceversa.
--   4. En Beach: dos completas no pueden solaparse.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserva_no_solape()
RETURNS trigger AS $$
BEGIN
  -- Si no es confirmada, no validamos
  IF NEW.estado != 'confirmada' THEN
    RETURN NEW;
  END IF;

  -- Caso A: reserva individual
  IF NEW.modalidad = 'apartamento' THEN
    -- A.1 Mismo apartamento confirmado y solapado
    IF EXISTS (
      SELECT 1 FROM public.reservas
      WHERE id != NEW.id
        AND estado = 'confirmada'
        AND apartamento_id = NEW.apartamento_id
        AND daterange(fecha_inicio, fecha_fin, '[)') && daterange(NEW.fecha_inicio, NEW.fecha_fin, '[)')
    ) THEN
      RAISE EXCEPTION 'Ya existe una reserva confirmada en este apartamento con fechas solapadas.'
        USING ERRCODE = 'exclusion_violation';
    END IF;

    -- A.2 Misma posada, modalidad completa
    IF EXISTS (
      SELECT 1 FROM public.reservas
      WHERE id != NEW.id
        AND estado = 'confirmada'
        AND posada_id = NEW.posada_id
        AND modalidad = 'completa'
        AND daterange(fecha_inicio, fecha_fin, '[)') && daterange(NEW.fecha_inicio, NEW.fecha_fin, '[)')
    ) THEN
      RAISE EXCEPTION 'La posada está reservada completa para esas fechas.'
        USING ERRCODE = 'exclusion_violation';
    END IF;
  END IF;

  -- Caso B: reserva completa
  IF NEW.modalidad = 'completa' THEN
    -- B.1 Cualquier otra reserva confirmada en la misma posada y solapada
    IF EXISTS (
      SELECT 1 FROM public.reservas
      WHERE id != NEW.id
        AND estado = 'confirmada'
        AND posada_id = NEW.posada_id
        AND daterange(fecha_inicio, fecha_fin, '[)') && daterange(NEW.fecha_inicio, NEW.fecha_fin, '[)')
    ) THEN
      RAISE EXCEPTION 'Ya hay reservas confirmadas en esta posada para esas fechas.'
        USING ERRCODE = 'exclusion_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservas_anti_solape
  BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW
  EXECUTE FUNCTION public.reserva_no_solape();
