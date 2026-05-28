-- =====================================================================
-- Migración 013 — Vulcanos puede ver reservas pendientes sin gestor
-- =====================================================================
-- UX: Vulcanos debe poder descubrir desde su listado las reservas
-- pendientes que vienen del público y todavía no tienen gestor
-- asignado, para poder "tomarlas" y luego confirmarlas (ganando comisión).
--
-- Sin esta policy, Vulcanos solo veía las reservas donde él ya es
-- gestor_id, y no podía descubrir nuevas.
-- =====================================================================

CREATE POLICY reservas_vulcanos_lectura_sin_gestor ON public.reservas
  FOR SELECT
  TO authenticated
  USING (
    public.user_rol() = 'vulcanos'
    AND estado = 'pendiente'
    AND gestor_id IS NULL
  );
