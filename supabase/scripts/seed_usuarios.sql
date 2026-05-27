-- =====================================================================
-- Script: seed_usuarios
-- =====================================================================
-- Corre este script DESPUÉS de haber creado los 4 usuarios en
-- Supabase Auth (Dashboard → Authentication → Users → Add user).
--
-- El script busca a cada usuario por su email en auth.users y crea
-- el registro correspondiente en public.usuarios con su rol.
--
-- Si los emails que usaste son distintos, edita las constantes abajo.
-- =====================================================================

-- ⚠️ AJUSTA estos 4 emails si usaste otros distintos al crear los usuarios.
WITH emails(email, nombre, rol, slug_posada) AS (
  VALUES
    ('dueno@test.com',    'Orlando Velásquez', 'dueno',    NULL),
    ('conserje@test.com', 'Conserje Confort',  'conserje', 'confort'),
    ('vulcanos@test.com', 'Vulcanos Tours',    'vulcanos', NULL),
    ('contador@test.com', 'Contador',          'contador', NULL)
)
INSERT INTO public.usuarios (id, email, nombre, rol, posada_id)
SELECT
  u.id,
  u.email,
  e.nombre,
  e.rol,
  (SELECT id FROM public.posadas WHERE slug = e.slug_posada)
FROM emails e
JOIN auth.users u ON u.email = e.email
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    nombre = EXCLUDED.nombre,
    rol = EXCLUDED.rol,
    posada_id = EXCLUDED.posada_id;

-- Verificación: muestra los 4 usuarios creados
SELECT u.email, p.nombre as nombre, p.rol, ps.nombre as posada
FROM public.usuarios p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.posadas ps ON ps.id = p.posada_id
ORDER BY p.rol;
