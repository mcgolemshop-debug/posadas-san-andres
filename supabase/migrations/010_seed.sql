-- =====================================================================
-- Migración 010 — Datos semilla
-- =====================================================================
-- Carga los datos reales conocidos: 2 posadas, 4 apartamentos de Confort,
-- 4 temporadas (Baja, Alta, Navidad 1, Navidad 2) y los precios de Beach
-- en baja (180/200/250 USD según num_personas).
--
-- Los precios pendientes (Confort en todas las temporadas, Beach en
-- temporadas altas) NO se insertan y deben cargarse cuando Orlando los
-- dicte. La especificación los marca como PENDIENTES.
--
-- Semana Santa NO se carga: fechas variables cada año, se agrega desde
-- el panel admin (Fase 3).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Posadas
-- ---------------------------------------------------------------------
INSERT INTO public.posadas (slug, nombre, descripcion, tipo_alquiler) VALUES
  (
    'confort',
    'San Andrés Confort',
    'Posada con 4 apartamentos independientes en Chichiriviche. Se alquila por apartamento o completa.',
    'individual_y_completa'
  ),
  (
    'beach',
    'San Andrés Beach',
    'Posada para grupos grandes en Chichiriviche. Se alquila completa, con tarifas según la cantidad de personas.',
    'solo_completa'
  );

-- ---------------------------------------------------------------------
-- Apartamentos (Confort)
-- ---------------------------------------------------------------------
-- Nombres provisionales — Orlando confirma/cambia desde el panel admin.
-- Características (piscina/garage), capacidad y fotos quedan PENDIENTES.
INSERT INTO public.apartamentos (posada_id, nombre, orden)
SELECT id, 'Amanecer',  1 FROM public.posadas WHERE slug = 'confort'
UNION ALL
SELECT id, 'Solana',    2 FROM public.posadas WHERE slug = 'confort'
UNION ALL
SELECT id, 'Atardecer', 3 FROM public.posadas WHERE slug = 'confort'
UNION ALL
SELECT id, 'Ocaso',     4 FROM public.posadas WHERE slug = 'confort';

-- ---------------------------------------------------------------------
-- Temporadas
-- ---------------------------------------------------------------------
-- Baja: temporada por defecto, sin fechas explícitas.
INSERT INTO public.temporadas (nombre, descripcion, fecha_inicio, fecha_fin, prioridad, estadia_minima_noches, fuerza_completa_confort)
VALUES (
  'Baja',
  'Temporada por defecto: cualquier fecha que no caiga en una temporada especial.',
  NULL, NULL,
  1, 1, false
);

-- Alta 2026: 1 ago – 30 sep
INSERT INTO public.temporadas (nombre, descripcion, fecha_inicio, fecha_fin, prioridad, estadia_minima_noches, fuerza_completa_confort)
VALUES (
  'Alta 2026',
  'Temporada alta de vacaciones (agosto-septiembre).',
  '2026-08-01', '2026-09-30',
  2, 1, false  -- estadia_minima_noches PENDIENTE de confirmar
);

-- Navidad 1 (2026): 21–29 dic — Confort SOLO completa
INSERT INTO public.temporadas (nombre, descripcion, fecha_inicio, fecha_fin, prioridad, estadia_minima_noches, fuerza_completa_confort)
VALUES (
  'Navidad 1 (2026)',
  'Pre-Navidad. En Confort se alquila SOLO completa.',
  '2026-12-21', '2026-12-29',
  3, 1, true  -- estadia_minima_noches PENDIENTE de confirmar
);

-- Navidad 2 (2026-2027): 30 dic – 10 ene — Confort SOLO completa
INSERT INTO public.temporadas (nombre, descripcion, fecha_inicio, fecha_fin, prioridad, estadia_minima_noches, fuerza_completa_confort)
VALUES (
  'Navidad 2 (2026-2027)',
  'Fin de año y primeros días de enero. En Confort se alquila SOLO completa.',
  '2026-12-30', '2027-01-10',
  3, 1, true  -- estadia_minima_noches PENDIENTE de confirmar
);

-- Semana Santa: PENDIENTE — se carga desde el panel admin cuando Orlando defina fechas y precios.

-- ---------------------------------------------------------------------
-- Precios CONOCIDOS de Beach (temporada baja)
-- ---------------------------------------------------------------------
-- En baja, el precio varía con el número de personas: 180/200/250 USD por noche.
INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'completa', 12, 180.00
FROM public.posadas p, public.temporadas t
WHERE p.slug = 'beach' AND t.nombre = 'Baja'
UNION ALL
SELECT p.id, t.id, 'completa', 16, 200.00
FROM public.posadas p, public.temporadas t
WHERE p.slug = 'beach' AND t.nombre = 'Baja'
UNION ALL
SELECT p.id, t.id, 'completa', 20, 250.00
FROM public.posadas p, public.temporadas t
WHERE p.slug = 'beach' AND t.nombre = 'Baja';

-- ---------------------------------------------------------------------
-- ⚠️ PRECIOS PENDIENTES (NO insertados — Orlando los dicta antes de Fase 2):
--   - Confort apartamento individual: temporada Baja y Alta
--   - Confort posada completa: Baja, Alta, Navidad 1, Navidad 2
--   - Beach: Alta, Navidad 1, Navidad 2 (¿también varía por num_personas?)
-- ---------------------------------------------------------------------
