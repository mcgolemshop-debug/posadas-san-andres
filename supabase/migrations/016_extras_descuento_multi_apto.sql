-- =====================================================================
-- Migración 016 — Mejoras post-lanzamiento
-- =====================================================================
-- Incluye:
--   1. Multi-apartamento: columna apartamentos_ids[] en reservas
--   2. Descuento: columna descuento_usd en reservas
--   3. Servicio extra: columna servicio_extra_usd en reservas
--   4. Personas extras: columna num_personas_extras + costo_extra_persona_usd
--      en temporadas (Baja=15, Alta y Navidades=20)
--   5. Soft-delete: columna eliminada_at en reservas + eliminado_at en pagos
--   6. Trigger reserva_no_solape actualizado para considerar apartamentos_ids
--   7. RLS: Vulcanos ve TODAS las reservas (lectura), edita solo las suyas
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columnas nuevas en reservas
-- ---------------------------------------------------------------------
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS apartamentos_ids uuid[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS descuento_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (descuento_usd >= 0),
  ADD COLUMN IF NOT EXISTS servicio_extra_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (servicio_extra_usd >= 0),
  ADD COLUMN IF NOT EXISTS num_personas_extras int NOT NULL DEFAULT 0 CHECK (num_personas_extras >= 0),
  ADD COLUMN IF NOT EXISTS eliminada_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.reservas.apartamentos_ids IS
  'Array de apartamentos cuando el cliente reserva varios a la vez en modalidad apartamento. NULL/[] significa usar apartamento_id legacy.';
COMMENT ON COLUMN public.reservas.descuento_usd IS
  'Descuento manual aplicado al total (USD). Se resta del subtotal+extras+servicio.';
COMMENT ON COLUMN public.reservas.servicio_extra_usd IS
  'Servicio extra (USD) — cobro adicional opcional que admin puede agregar (ej: limpieza extra, traslado).';
COMMENT ON COLUMN public.reservas.num_personas_extras IS
  'Cantidad de personas adicionales a la capacidad incluida. Se cobra a costo_extra_persona_usd según temporada.';
COMMENT ON COLUMN public.reservas.eliminada_at IS
  'Soft-delete. NULL = activa. Cuando se llena, la reserva se considera borrada (no se muestra en listados).';

-- ---------------------------------------------------------------------
-- 2. Columna nueva en temporadas
-- ---------------------------------------------------------------------
ALTER TABLE public.temporadas
  ADD COLUMN IF NOT EXISTS costo_extra_persona_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (costo_extra_persona_usd >= 0);

COMMENT ON COLUMN public.temporadas.costo_extra_persona_usd IS
  'USD por persona extra por noche en esta temporada. Aplica cuando num_personas excede la capacidad incluida.';

-- Seed: Baja = 15, Alta y Navidades = 20 (decisión de Orlando, Onda 2)
UPDATE public.temporadas SET costo_extra_persona_usd = 15 WHERE nombre = 'Baja';
UPDATE public.temporadas SET costo_extra_persona_usd = 20 WHERE nombre IN ('Alta 2026', 'Navidad 1 (2026)', 'Navidad 2 (2026-2027)');

-- ---------------------------------------------------------------------
-- 3. Soft-delete en pagos
-- ---------------------------------------------------------------------
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS eliminado_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.pagos.eliminado_at IS
  'Soft-delete. NULL = activo. Cuando se llena, no se considera para saldos pendientes.';

-- ---------------------------------------------------------------------
-- 4. Trigger reserva_no_solape actualizado
-- ---------------------------------------------------------------------
-- Ahora considera apartamentos_ids[]: si está poblado, valida cada uno.
-- Si NO está poblado, cae al comportamiento legacy con apartamento_id.
-- También ignora reservas eliminadas (eliminada_at IS NOT NULL).

CREATE OR REPLACE FUNCTION public.reserva_no_solape()
RETURNS trigger AS $$
DECLARE
  ids_a_validar uuid[];
  apto_id uuid;
BEGIN
  -- Si no es confirmada o está eliminada, no validamos
  IF NEW.estado != 'confirmada' OR NEW.eliminada_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Construir array de apartamentos que pueden colisionar
  IF NEW.modalidad = 'apartamento' THEN
    IF NEW.apartamentos_ids IS NOT NULL AND array_length(NEW.apartamentos_ids, 1) > 0 THEN
      ids_a_validar := NEW.apartamentos_ids;
    ELSIF NEW.apartamento_id IS NOT NULL THEN
      ids_a_validar := ARRAY[NEW.apartamento_id];
    ELSE
      RAISE EXCEPTION 'Reserva de modalidad apartamento debe tener apartamento_id o apartamentos_ids.';
    END IF;

    -- Validar cada apto contra otras reservas confirmadas no eliminadas
    FOREACH apto_id IN ARRAY ids_a_validar LOOP
      -- A.1 Mismo apto en otra reserva (vía apartamento_id legacy o apartamentos_ids)
      IF EXISTS (
        SELECT 1 FROM public.reservas
        WHERE id != NEW.id
          AND estado = 'confirmada'
          AND eliminada_at IS NULL
          AND (
            apartamento_id = apto_id
            OR (apartamentos_ids IS NOT NULL AND apto_id = ANY(apartamentos_ids))
          )
          AND daterange(fecha_inicio, fecha_fin, '[)') && daterange(NEW.fecha_inicio, NEW.fecha_fin, '[)')
      ) THEN
        RAISE EXCEPTION 'Ya existe una reserva confirmada en el apartamento % con fechas solapadas.', apto_id
          USING ERRCODE = 'exclusion_violation';
      END IF;
    END LOOP;

    -- A.2 Misma posada con modalidad completa
    IF EXISTS (
      SELECT 1 FROM public.reservas
      WHERE id != NEW.id
        AND estado = 'confirmada'
        AND eliminada_at IS NULL
        AND posada_id = NEW.posada_id
        AND modalidad = 'completa'
        AND daterange(fecha_inicio, fecha_fin, '[)') && daterange(NEW.fecha_inicio, NEW.fecha_fin, '[)')
    ) THEN
      RAISE EXCEPTION 'La posada está reservada completa para esas fechas.'
        USING ERRCODE = 'exclusion_violation';
    END IF;
  END IF;

  -- Caso B: reserva completa — bloquea cualquier otra en la misma posada
  IF NEW.modalidad = 'completa' THEN
    IF EXISTS (
      SELECT 1 FROM public.reservas
      WHERE id != NEW.id
        AND estado = 'confirmada'
        AND eliminada_at IS NULL
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

-- ---------------------------------------------------------------------
-- 5. RLS: Vulcanos ve TODAS las reservas (lectura)
-- ---------------------------------------------------------------------
-- Sustituye las policies vulcanos_lectura anteriores que solo dejaban
-- ver sus propias reservas. Ahora Vulcanos:
--   - Ve TODAS las reservas (cualquier estado, cualquier posada)
--   - Sigue pudiendo crear/editar SOLO las que ella gestiona (gestor_id=ella)
--
-- Las policies vulcanos_insert y vulcanos_update existentes quedan intactas.

-- Eliminamos las dos lecturas restrictivas anteriores (lectura y lectura_sin_gestor)
DROP POLICY IF EXISTS reservas_vulcanos_lectura ON public.reservas;
DROP POLICY IF EXISTS reservas_vulcanos_lectura_sin_gestor ON public.reservas;

-- Nueva lectura amplia
CREATE POLICY reservas_vulcanos_lectura_todas ON public.reservas
  FOR SELECT
  TO authenticated
  USING (public.user_rol() = 'vulcanos');

-- Bonus: Vulcanos también ve pagos y comisiones a modo lectura (ya tenía las suyas)
-- pero ahora con la nueva lógica que ve todas las reservas, también debe ver
-- pagos asociados a esas reservas para tener contexto.
DROP POLICY IF EXISTS pagos_vulcanos_lectura ON public.pagos;
CREATE POLICY pagos_vulcanos_lectura_todas ON public.pagos
  FOR SELECT
  TO authenticated
  USING (public.user_rol() = 'vulcanos');
