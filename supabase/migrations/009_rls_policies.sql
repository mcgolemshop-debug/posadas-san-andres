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
