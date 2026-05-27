-- =====================================================================
-- Migración 001 — Posadas y apartamentos
-- =====================================================================
-- Crea las tablas base de las 2 posadas (San Andrés Confort y Beach)
-- y los 4 apartamentos individuales de Confort.
-- =====================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- para EXCLUSION con gist

-- ---------------------------------------------------------------------
-- Tabla: posadas
-- ---------------------------------------------------------------------
CREATE TABLE public.posadas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,            -- 'confort' | 'beach'
  nombre       text NOT NULL,
  descripcion  text,
  -- 'individual_y_completa' = Confort. 'solo_completa' = Beach.
  tipo_alquiler text NOT NULL CHECK (tipo_alquiler IN ('individual_y_completa', 'solo_completa')),
  foto_portada text,
  galeria_urls text[] NOT NULL DEFAULT '{}',
  activa       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabla: apartamentos
-- ---------------------------------------------------------------------
CREATE TABLE public.apartamentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id       uuid NOT NULL REFERENCES public.posadas(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  caracteristica  text,         -- 'piscina' | 'garage' | NULL
  capacidad       int,          -- máximo de huéspedes; pendiente de definir
  orden           int NOT NULL DEFAULT 0,
  foto_portada    text,
  galeria_urls    text[] NOT NULL DEFAULT '{}',
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (posada_id, nombre)
);

CREATE INDEX idx_apartamentos_posada ON public.apartamentos (posada_id);

-- ---------------------------------------------------------------------
-- Trigger para mantener updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posadas_set_updated_at
  BEFORE UPDATE ON public.posadas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER apartamentos_set_updated_at
  BEFORE UPDATE ON public.apartamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- =====================================================================
-- Migración 002 — Usuarios
-- =====================================================================
-- Extiende auth.users con rol y posada asignada (cuando aplique).
-- Los 4 roles son: dueno, conserje, vulcanos, contador.
-- =====================================================================

CREATE TABLE public.usuarios (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  nombre      text NOT NULL,
  telefono    text,
  rol         text NOT NULL CHECK (rol IN ('dueno', 'conserje', 'vulcanos', 'contador')),
  -- Solo se llena cuando rol='conserje' (un conserje pertenece a una posada)
  posada_id   uuid REFERENCES public.posadas(id) ON DELETE SET NULL,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Si es conserje, tiene que tener posada
  CONSTRAINT conserje_tiene_posada CHECK (
    rol != 'conserje' OR posada_id IS NOT NULL
  )
);

CREATE INDEX idx_usuarios_rol ON public.usuarios (rol);
CREATE INDEX idx_usuarios_posada ON public.usuarios (posada_id);

CREATE TRIGGER usuarios_set_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Helpers para usar en políticas RLS de otras tablas
-- ---------------------------------------------------------------------

-- Devuelve el rol del usuario logueado, o NULL si no hay sesión
CREATE OR REPLACE FUNCTION public.user_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- Devuelve la posada asignada del usuario logueado (solo aplica a conserjes)
CREATE OR REPLACE FUNCTION public.user_posada_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT posada_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.user_rol() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_posada_id() TO authenticated, anon;
-- =====================================================================
-- Migración 003 — Temporadas y precios
-- =====================================================================
-- Temporadas: Baja (default), Alta (1 ago-30 sep), Navidad 1 (21-29 dic),
-- Navidad 2 (30 dic-10 ene), Semana Santa (variable).
--
-- Precios: por posada × temporada × modalidad × num_personas (Beach baja).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: temporadas
-- ---------------------------------------------------------------------
CREATE TABLE public.temporadas (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                 text NOT NULL,
  descripcion            text,
  -- Rango de fechas. NULL/NULL = "default" (temporada baja).
  fecha_inicio           date,
  fecha_fin              date,
  -- Mayor número = mayor prioridad cuando una fecha cae en varias.
  -- Baja=1, Alta=2, Navidad/SS=3.
  prioridad              int NOT NULL CHECK (prioridad >= 1),
  estadia_minima_noches  int NOT NULL DEFAULT 1 CHECK (estadia_minima_noches >= 1),
  -- En Confort, si activa, esta temporada fuerza modalidad=completa.
  fuerza_completa_confort boolean NOT NULL DEFAULT false,
  activa                 boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (fecha_inicio IS NULL AND fecha_fin IS NULL) OR
    (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND fecha_fin >= fecha_inicio)
  )
);

CREATE INDEX idx_temporadas_fechas ON public.temporadas (fecha_inicio, fecha_fin) WHERE activa;
CREATE INDEX idx_temporadas_prioridad ON public.temporadas (prioridad DESC) WHERE activa;

CREATE TRIGGER temporadas_set_updated_at
  BEFORE UPDATE ON public.temporadas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Tabla: precios
-- ---------------------------------------------------------------------
-- Estructura: una fila por combinación posada × temporada × modalidad × num_personas
-- num_personas es relevante para Beach baja (12, 16, 20); en otros casos es NULL.
CREATE TABLE public.precios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id     uuid NOT NULL REFERENCES public.posadas(id) ON DELETE CASCADE,
  temporada_id  uuid NOT NULL REFERENCES public.temporadas(id) ON DELETE RESTRICT,
  modalidad     text NOT NULL CHECK (modalidad IN ('apartamento', 'completa')),
  num_personas  int,
  precio_usd    numeric(10,2) NOT NULL CHECK (precio_usd >= 0),
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Unicidad: una tarifa por combinación (Postgres 15+ permite NULLS NOT DISTINCT)
ALTER TABLE public.precios
  ADD CONSTRAINT precios_unicidad
  UNIQUE NULLS NOT DISTINCT (posada_id, temporada_id, modalidad, num_personas);

CREATE INDEX idx_precios_posada_temp ON public.precios (posada_id, temporada_id) WHERE activo;

CREATE TRIGGER precios_set_updated_at
  BEFORE UPDATE ON public.precios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
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
-- =====================================================================
-- Migración 006 — Gastos
-- =====================================================================
-- Gastos operativos de cada posada. Categorías predefinidas según
-- la especificación.
-- =====================================================================

CREATE TABLE public.gastos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id       uuid NOT NULL REFERENCES public.posadas(id) ON DELETE RESTRICT,
  categoria       text NOT NULL
                  CHECK (categoria IN (
                    'electrico',
                    'aires',
                    'iluminacion',
                    'pintura',
                    'seguridad',
                    'reparaciones',
                    'otros'
                  )),
  descripcion     text NOT NULL,
  monto_usd       numeric(10,2) NOT NULL CHECK (monto_usd > 0),
  fecha           date NOT NULL,
  recibo_url      text,
  registrado_por  uuid REFERENCES public.usuarios(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gastos_posada_fecha ON public.gastos (posada_id, fecha DESC);
CREATE INDEX idx_gastos_categoria ON public.gastos (categoria);

CREATE TRIGGER gastos_set_updated_at
  BEFORE UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
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
-- =====================================================================
-- Migración 008 — Nómina
-- =====================================================================
-- Sueldos de conserjes y pagos recurrentes asociados a una posada.
-- Solo el Dueño puede modificar; Contador lee.
-- =====================================================================

CREATE TABLE public.nomina (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  posada_id       uuid REFERENCES public.posadas(id) ON DELETE SET NULL,
  periodo_inicio  date NOT NULL,
  periodo_fin     date NOT NULL,
  CHECK (periodo_fin >= periodo_inicio),
  concepto        text NOT NULL,                  -- 'sueldo', 'bono', 'aguinaldo', etc.
  monto_usd       numeric(10,2) NOT NULL CHECK (monto_usd >= 0),
  estado          text NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  fecha_pago      date,
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nomina_usuario ON public.nomina (usuario_id);
CREATE INDEX idx_nomina_posada ON public.nomina (posada_id);
CREATE INDEX idx_nomina_periodo ON public.nomina (periodo_inicio, periodo_fin);

CREATE TRIGGER nomina_set_updated_at
  BEFORE UPDATE ON public.nomina
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- =====================================================================
-- Migración 009 — Row Level Security (RLS)
-- =====================================================================
-- Aplica las reglas de acceso por rol DIRECTAMENTE en la base de datos.
-- Esto significa que incluso si alguien hackea el frontend, no podrá
-- leer ni modificar datos que no le tocan.
--
-- Roles:
--   - dueno    : todo
--   - conserje : su posada (lectura), gastos (escritura su posada)
--   - vulcanos : sus reservas y pagos
--   - contador : lectura financiera
--   - anon     : leer posadas/apartamentos/temporadas/precios activos
--                e insertar reservas en estado 'pendiente'
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) posadas
-- ---------------------------------------------------------------------
ALTER TABLE public.posadas ENABLE ROW LEVEL SECURITY;

-- Cualquiera (público) puede ver las posadas activas — necesario para la home
CREATE POLICY posadas_publico_lectura ON public.posadas
  FOR SELECT
  TO anon, authenticated
  USING (activa = true OR public.user_rol() IN ('dueno', 'contador'));

-- Solo Dueño escribe
CREATE POLICY posadas_dueno_all ON public.posadas
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

-- ---------------------------------------------------------------------
-- 2) apartamentos
-- ---------------------------------------------------------------------
ALTER TABLE public.apartamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY apartamentos_publico_lectura ON public.apartamentos
  FOR SELECT
  TO anon, authenticated
  USING (activo = true OR public.user_rol() IN ('dueno', 'contador'));

CREATE POLICY apartamentos_dueno_all ON public.apartamentos
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

-- ---------------------------------------------------------------------
-- 3) usuarios
-- ---------------------------------------------------------------------
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Dueño ve y administra todos
CREATE POLICY usuarios_dueno_all ON public.usuarios
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

-- Cualquier usuario logueado puede leer su propio registro
CREATE POLICY usuarios_self_lectura ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ---------------------------------------------------------------------
-- 4) temporadas
-- ---------------------------------------------------------------------
ALTER TABLE public.temporadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY temporadas_publico_lectura ON public.temporadas
  FOR SELECT
  TO anon, authenticated
  USING (activa = true OR public.user_rol() IN ('dueno', 'contador'));

CREATE POLICY temporadas_dueno_all ON public.temporadas
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

-- ---------------------------------------------------------------------
-- 5) precios
-- ---------------------------------------------------------------------
ALTER TABLE public.precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY precios_publico_lectura ON public.precios
  FOR SELECT
  TO anon, authenticated
  USING (activo = true OR public.user_rol() IN ('dueno', 'contador'));

CREATE POLICY precios_dueno_all ON public.precios
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

-- ---------------------------------------------------------------------
-- 6) reservas
-- ---------------------------------------------------------------------
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Anon (cliente público) puede crear reservas SOLO en estado pendiente
CREATE POLICY reservas_anon_insert ON public.reservas
  FOR INSERT
  TO anon
  WITH CHECK (estado = 'pendiente' AND gestor_id IS NULL);

-- Dueño: todo
CREATE POLICY reservas_dueno_all ON public.reservas
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

-- Contador: lectura de todo
CREATE POLICY reservas_contador_lectura ON public.reservas
  FOR SELECT
  TO authenticated
  USING (public.user_rol() = 'contador');

-- Conserje: lectura de las de su posada
CREATE POLICY reservas_conserje_lectura ON public.reservas
  FOR SELECT
  TO authenticated
  USING (
    public.user_rol() = 'conserje'
    AND posada_id = public.user_posada_id()
  );

-- Conserje: puede crear una reserva (la trajo el huésped) en su posada
CREATE POLICY reservas_conserje_insert ON public.reservas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_rol() = 'conserje'
    AND posada_id = public.user_posada_id()
    AND estado = 'pendiente'
  );

-- Vulcanos: lectura de las suyas
CREATE POLICY reservas_vulcanos_lectura ON public.reservas
  FOR SELECT
  TO authenticated
  USING (
    public.user_rol() = 'vulcanos'
    AND gestor_id = auth.uid()
  );

-- Vulcanos: puede crear (con su id como gestor)
CREATE POLICY reservas_vulcanos_insert ON public.reservas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_rol() = 'vulcanos'
    AND gestor_id = auth.uid()
  );

-- Vulcanos: puede actualizar las suyas (confirmar/rechazar/cancelar)
CREATE POLICY reservas_vulcanos_update ON public.reservas
  FOR UPDATE
  TO authenticated
  USING (
    public.user_rol() = 'vulcanos'
    AND gestor_id = auth.uid()
  )
  WITH CHECK (
    public.user_rol() = 'vulcanos'
    AND gestor_id = auth.uid()
  );

-- ---------------------------------------------------------------------
-- 7) pagos
-- ---------------------------------------------------------------------
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY pagos_dueno_all ON public.pagos
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

CREATE POLICY pagos_contador_lectura ON public.pagos
  FOR SELECT
  TO authenticated
  USING (public.user_rol() = 'contador');

-- Vulcanos: ve pagos de SUS reservas
CREATE POLICY pagos_vulcanos_lectura ON public.pagos
  FOR SELECT
  TO authenticated
  USING (
    public.user_rol() = 'vulcanos'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = pagos.reserva_id
        AND r.gestor_id = auth.uid()
    )
  );

CREATE POLICY pagos_vulcanos_insert ON public.pagos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_rol() = 'vulcanos'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id
        AND r.gestor_id = auth.uid()
    )
  );

-- Conserje: ve pagos de reservas de su posada
CREATE POLICY pagos_conserje_lectura ON public.pagos
  FOR SELECT
  TO authenticated
  USING (
    public.user_rol() = 'conserje'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = pagos.reserva_id
        AND r.posada_id = public.user_posada_id()
    )
  );

-- ---------------------------------------------------------------------
-- 8) gastos
-- ---------------------------------------------------------------------
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY gastos_dueno_all ON public.gastos
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

CREATE POLICY gastos_contador_lectura ON public.gastos
  FOR SELECT
  TO authenticated
  USING (public.user_rol() = 'contador');

-- Conserje: lee y escribe gastos de SU posada
CREATE POLICY gastos_conserje_lectura ON public.gastos
  FOR SELECT
  TO authenticated
  USING (
    public.user_rol() = 'conserje'
    AND posada_id = public.user_posada_id()
  );

CREATE POLICY gastos_conserje_insert ON public.gastos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_rol() = 'conserje'
    AND posada_id = public.user_posada_id()
    AND registrado_por = auth.uid()
  );

CREATE POLICY gastos_conserje_update ON public.gastos
  FOR UPDATE
  TO authenticated
  USING (
    public.user_rol() = 'conserje'
    AND posada_id = public.user_posada_id()
    AND registrado_por = auth.uid()
  )
  WITH CHECK (
    public.user_rol() = 'conserje'
    AND posada_id = public.user_posada_id()
  );

-- ---------------------------------------------------------------------
-- 9) comisiones
-- ---------------------------------------------------------------------
ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY comisiones_dueno_all ON public.comisiones
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

CREATE POLICY comisiones_contador_lectura ON public.comisiones
  FOR SELECT
  TO authenticated
  USING (public.user_rol() = 'contador');

-- Beneficiario (Vulcanos o conserje) ve sus comisiones
CREATE POLICY comisiones_beneficiario_lectura ON public.comisiones
  FOR SELECT
  TO authenticated
  USING (beneficiario_id = auth.uid());

-- ---------------------------------------------------------------------
-- 10) nomina
-- ---------------------------------------------------------------------
ALTER TABLE public.nomina ENABLE ROW LEVEL SECURITY;

CREATE POLICY nomina_dueno_all ON public.nomina
  FOR ALL
  TO authenticated
  USING (public.user_rol() = 'dueno')
  WITH CHECK (public.user_rol() = 'dueno');

CREATE POLICY nomina_contador_lectura ON public.nomina
  FOR SELECT
  TO authenticated
  USING (public.user_rol() = 'contador');

-- Cada empleado puede ver SU propia nómina
CREATE POLICY nomina_self_lectura ON public.nomina
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());
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
