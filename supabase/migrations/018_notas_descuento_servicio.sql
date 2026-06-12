-- =====================================================================
-- Migración 018: notas explicativas para descuento y servicio extra
-- =====================================================================
-- Permite que el admin (al editar una reserva) anote POR QUÉ se aplica
-- cada recargo o descuento, dejando un rastro claro para auditoría.
-- =====================================================================

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS nota_descuento text,
  ADD COLUMN IF NOT EXISTS nota_servicio_extra text;

COMMENT ON COLUMN public.reservas.nota_descuento IS
  'Explicación libre del descuento aplicado (ej: "Negociación con Vulcanos, precio acordado 1100 USD").';
COMMENT ON COLUMN public.reservas.nota_servicio_extra IS
  'Explicación libre del cobro de servicio extra (ej: "Lancha al cliente, 2 personas adicionales").';
