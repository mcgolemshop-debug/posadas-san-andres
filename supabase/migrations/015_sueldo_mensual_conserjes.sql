-- =====================================================================
-- Migración 015 — Sueldo mensual de conserjes
-- =====================================================================
-- Agrega columna sueldo_mensual_usd a public.usuarios.
-- Usada por el módulo de Nómina (Fase 4) para generar los pagos
-- recurrentes mensuales de cada conserje.
--
-- Por simplicidad, el sueldo vive en el perfil del usuario (no en una
-- tabla de histórico de salarios). Si en el futuro se necesita historial,
-- se puede crear una tabla separada.
-- =====================================================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS sueldo_mensual_usd numeric(10,2);

COMMENT ON COLUMN public.usuarios.sueldo_mensual_usd IS
  'Sueldo fijo mensual en USD del conserje. NULL = no aplica (o no configurado todavía). Se usa al generar la nómina del mes.';
