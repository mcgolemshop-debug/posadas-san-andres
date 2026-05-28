-- =====================================================================
-- Migración 011 — Datos confirmados por Orlando (28 may 2026)
-- =====================================================================
-- Aplica los datos que Orlando confirmó después de la Fase 1:
--   - Precios completos de Confort (apto y completa, todas las temporadas
--     conocidas; Semana Santa sigue pendiente)
--   - Precios de Beach en temporadas altas (plano)
--   - Capacidad y características de los 4 apartamentos
--   - Estadía mínima por temporada
--   - Descripciones afinadas de las dos posadas
--
-- Idempotente: usa ON CONFLICT / IF NOT EXISTS para que se pueda
-- volver a correr sin error si los datos ya están.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Apartamentos: capacidad y característica
-- ---------------------------------------------------------------------
UPDATE public.apartamentos SET capacidad = 7, caracteristica = 'garage'
  WHERE nombre = 'Amanecer';
UPDATE public.apartamentos SET capacidad = 7, caracteristica = 'garage'
  WHERE nombre = 'Solana';
UPDATE public.apartamentos SET capacidad = 7, caracteristica = 'piscina'
  WHERE nombre = 'Atardecer';
UPDATE public.apartamentos SET capacidad = 7, caracteristica = 'piscina'
  WHERE nombre = 'Ocaso';

-- ---------------------------------------------------------------------
-- Posadas: afinar descripciones con datos confirmados
-- ---------------------------------------------------------------------
UPDATE public.posadas
   SET descripcion = 'Posada con 4 apartamentos independientes en Chichiriviche. Cada apartamento aloja hasta 7 personas (28 en total). Se alquila por apartamento o completa.'
 WHERE slug = 'confort';

UPDATE public.posadas
   SET descripcion = 'Casa de dos pisos frente al mar en Chichiriviche. Capacidad para 20 personas. Siempre se alquila completa; en temporada baja el precio depende del número de personas.'
 WHERE slug = 'beach';

-- ---------------------------------------------------------------------
-- Temporadas: estadía mínima de noches
-- ---------------------------------------------------------------------
UPDATE public.temporadas SET estadia_minima_noches = 2 WHERE nombre = 'Baja';
UPDATE public.temporadas SET estadia_minima_noches = 3 WHERE nombre = 'Alta 2026';
UPDATE public.temporadas SET estadia_minima_noches = 4 WHERE nombre = 'Navidad 1 (2026)';
UPDATE public.temporadas SET estadia_minima_noches = 4 WHERE nombre = 'Navidad 2 (2026-2027)';

-- ---------------------------------------------------------------------
-- Precios de Confort
-- ---------------------------------------------------------------------
-- Baja: apto $85, completa $320
-- Alta: apto $100, completa $400
-- Navidad 1: solo completa $400
-- Navidad 2: solo completa $450
-- (Semana Santa pendiente)
INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'apartamento', NULL, 85.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'confort' AND t.nombre = 'Baja'
ON CONFLICT DO NOTHING;

INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'completa', NULL, 320.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'confort' AND t.nombre = 'Baja'
ON CONFLICT DO NOTHING;

INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'apartamento', NULL, 100.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'confort' AND t.nombre = 'Alta 2026'
ON CONFLICT DO NOTHING;

INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'completa', NULL, 400.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'confort' AND t.nombre = 'Alta 2026'
ON CONFLICT DO NOTHING;

INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'completa', NULL, 400.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'confort' AND t.nombre = 'Navidad 1 (2026)'
ON CONFLICT DO NOTHING;

INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'completa', NULL, 450.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'confort' AND t.nombre = 'Navidad 2 (2026-2027)'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- Precios de Beach en temporadas altas (plano, no varía por personas)
-- ---------------------------------------------------------------------
INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'completa', NULL, 300.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'beach' AND t.nombre = 'Alta 2026'
ON CONFLICT DO NOTHING;

INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'completa', NULL, 325.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'beach' AND t.nombre = 'Navidad 1 (2026)'
ON CONFLICT DO NOTHING;

INSERT INTO public.precios (posada_id, temporada_id, modalidad, num_personas, precio_usd)
SELECT p.id, t.id, 'completa', NULL, 325.00
  FROM public.posadas p, public.temporadas t
 WHERE p.slug = 'beach' AND t.nombre = 'Navidad 2 (2026-2027)'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- ⚠️ AÚN PENDIENTE
--   - Semana Santa: fechas, precio y noches mínimas
--   - Apartamentos: nombres definitivos
-- ---------------------------------------------------------------------
