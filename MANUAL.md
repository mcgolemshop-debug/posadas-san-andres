# Manual de uso — Sistema Posadas San Andrés

Documento breve para cada rol. Léelo una vez de principio a fin y úsalo como referencia después.

---

## 1. Cómo entrar al panel

1. Abre [https://tu-dominio.com/admin/login](https://tu-dominio.com/admin/login) (cuando estemos desplegados; mientras tanto: `http://localhost:3000/admin/login`).
2. Escribe tu email y tu contraseña.
3. Click **"Entrar"** → te lleva al panel.
4. Para salir: botón **"Cerrar sesión"** arriba a la derecha.

### Si se te olvida la contraseña

Pídele al **Dueño** que entre a `/admin/usuarios`, te desactive y te vuelva a crear. (Próxima versión: enlace de "olvidé mi contraseña" automático.)

---

## 2. Lo que ve cada rol

### 👑 Dueño — Orlando

**Tiene acceso total.** En la barra superior aparecen todos los módulos:

- **Inicio** — métricas clave (reservas pendientes, ingresos del mes).
- **Reservas** — listado completo con filtros + detalle. Aquí confirmas o rechazas reservas.
- **Calendario** — vista mensual de qué fechas están bloqueadas.
- **Gastos** — registrar gastos propios + ver los de los conserjes.
- **Comisiones** — ver y marcar pagadas las del 10%.
- **Pagos** — registrar pagos recibidos por canal (Zelle, Binance, banco, efectivo).
- **Nómina** — configurar sueldo mensual de conserjes, generar nómina del mes, dar bonos.
- **Reportes** — utilidad neta del mes + exportar CSV para el contador.
- **Usuarios** — crear / desactivar conserjes y socios.
- **Posadas y precios** — editar nombres, características, temporadas, tarifas.

### 🛎️ Conserje (uno por posada)

Solo ve **su posada**. Puede:

- Ver **reservas** de su posada (sin botones de confirmar — eso es del Dueño).
- Ver el **calendario** de ocupación de su posada.
- Registrar **gastos** que él hace (con foto del recibo opcional).
- Ver el módulo de **comisiones** con las que le tocan (por reservas que él trajo).

### 🌊 Vulcanos Tours (socio comercial)

Solo ve **sus propias reservas** y las pendientes sin gestor (para tomarlas).

- En **Reservas** ve las que él gestiona + las pendientes "libres" del público.
- Puede **tomarse** una pendiente sin gestor (botón "🙋 Asignarme como gestor"), después puede confirmarla.
- Al confirmar, se genera automáticamente la **comisión 10%**.
- Ve sus comisiones en el módulo **Comisiones**.

### 📊 Contador

Solo lectura financiera. Ve **todo** pero no modifica nada:

- Reservas, gastos, comisiones, nómina, pagos, reportes.
- **Exportar CSV** desde Reportes para hacer la contabilidad mensual.

---

## 3. Tareas frecuentes paso a paso

### A. Confirmar una reserva nueva (Dueño)

1. Te llega un email a `mcgolemshop@gmail.com` con asunto **"Nueva solicitud"** y un botón **"Ver comprobante"**.
2. Entra al panel → **Reservas** → busca esa solicitud (estado `Pendiente`).
3. Abre el detalle, click **"📎 Ver comprobante"** para verificar el pago.
4. Si está OK: click **"✓ Confirmar reserva"** → bloquea fechas y manda email al cliente.
5. Si NO está OK: click **"✗ Rechazar"** → escribe motivo → confirmar.

### B. Registrar un gasto (Dueño o Conserje)

1. Ve a **Gastos** → click **"+ Registrar gasto"**.
2. Llena: posada (si eres Dueño), categoría, descripción, monto, fecha.
3. Sube foto del recibo (opcional pero recomendado).
4. Click **"Registrar gasto"**.

### C. Registrar un pago recibido (Dueño)

1. Ve a **Pagos** → click **"+ Registrar pago"**.
2. Elige la reserva del dropdown (debe estar confirmada).
3. Canal por el que entró el dinero.
4. Monto bruto. Si Vulcanos cobró y descontó su 10%, anota la comisión retenida y verás el neto que te llegó.
5. Click **"Registrar pago"**.

### D. Generar la nómina del mes (Dueño)

**Primero, configura el sueldo mensual de cada conserje (una sola vez):**
1. Ve a **Nómina** → tabla "Sueldos mensuales configurados".
2. Para cada conserje, escribe el monto en USD y click **OK**.

**Cada mes, generar la nómina:**
1. Ve a **Nómina** → sección "Acciones" → selector de mes → click **"Generar sueldos del mes"**.
2. Se crean automáticamente entradas pendientes para todos los conserjes activos con sueldo > 0.
3. Cuando pagas a un conserje, en la tabla de historial click **"Marcar pagada"** → elige fecha.

**Para bonos o pagos puntuales:**
1. Click **"+ Bono / pago puntual"**.
2. Elige empleado, concepto (ej. "aguinaldo"), monto, fecha.

### E. Exportar reporte mensual para el Contador (Dueño o Contador)

1. Ve a **Reportes**.
2. Elige el mes con los botones **← Anterior / Siguiente →**.
3. Click el botón verde **"📥 Descargar movimientos.csv"**.
4. Abre el archivo en Excel o Google Sheets.
5. Las columnas son: fecha, tipo (ingreso/gasto/comisión/nómina), concepto, posada, monto entrando, monto saliendo, notas.

### F. Cargar Semana Santa cada año (Dueño)

1. Ve a **Posadas y precios** → sección **Temporadas**.
2. Click **"+ Crear nueva temporada"**.
3. Llena: nombre (ej. "Semana Santa 2026"), fecha inicio, fecha fin, prioridad **3**, mínimo noches.
4. ✅ **Marca el check "En Confort, esta temporada solo permite completa"** (importante).
5. Click **"Crear temporada"**.
6. Luego ve a la sección **Precios** y agrega tarifas para Semana Santa (Confort completa, Beach completa).

### G. Cambiar el nombre o características de un apartamento (Dueño)

1. Ve a **Posadas y precios** → sección **Apartamentos**.
2. Edita el nombre, característica (piscina/garage) o capacidad.
3. Click **"Guardar"** en esa tarjeta.

---

## 4. Mantenimiento

### Backups de Supabase

Supabase hace backup automático diario en el plan gratis. Para descargar uno manualmente:

1. Entra a Supabase → tu proyecto → **Database** → **Backups**.
2. Click en el backup del día → **"Download"**.

Guarda al menos uno por mes en tu computadora.

### Actualizar fotos de las posadas

(Próxima versión incluye uploader de fotos. Mientras tanto, las fotos placeholder se ven igual; el sistema funciona.)

### Cambiar contraseña de un usuario

1. Como **Dueño**, ve a **Usuarios**.
2. Desactiva al usuario.
3. Vuélvelo a crear con la contraseña nueva.

### Si el email de Resend ya no funciona

1. Entra a [resend.com](https://resend.com) con `mcgolemshop@gmail.com`.
2. Settings → API Keys → genera una nueva.
3. Cópiala y reemplaza `RESEND_API_KEY` en las variables de entorno de Vercel (Settings → Environment Variables).
4. Redeploy.

### Si llegamos al límite del plan gratis de Supabase

Supabase Free permite 500 MB de base + 1 GB de Storage. Cuando se llene:
1. Borrar reservas viejas (más de 2 años) y comprobantes asociados.
2. O subir al plan Pro ($25/mes) que da 8 GB.

---

## 5. Decisiones todavía pendientes

Estas las puedes resolver desde el panel admin cuando estés listo:

- ✅ **Datos bancarios reales** — pídele al programador que los ponga en la página de confirmación del cliente.
- ✅ **Dominio propio** — antes del despliegue final en Vercel.
- ✅ **Fotos reales** — para subir cuando estén listas (módulo de fotos en próxima versión).
- ✅ **Semana Santa** — crear cada año desde **Posadas y precios → Temporadas**.

---

## 6. Soporte

Para problemas técnicos: contacta al programador del sistema.
Para uso día a día: este manual debería cubrir todo. Si no, prueba haciendo click en los botones — el sistema te confirma cada acción.
