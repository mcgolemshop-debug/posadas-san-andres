# Posadas San Andrés — Especificación del sistema

Sistema de reservaciones y gestión para dos posadas en Chichiriviche, estado Falcón.
Versión 1.0

---

## 1. Resumen del proyecto

Sistema web para gestionar dos posadas: **San Andrés Confort** y **San Andrés Beach**. Cubre dos áreas: la reservación de hospedaje por parte de los clientes, y la administración interna del negocio (gastos de mantenimiento, comisiones, nómina e ingresos por múltiples canales de cobro).

**Arquitectura: una sola aplicación.** Una única app integra ambas posadas, no dos sitios separados. De cara al cliente, cada posada funciona de forma independiente (sus propias fotos, precios, disponibilidad y reservas). Por detrás comparten una misma administración, con contabilidad, gastos y comisiones consolidados.

**Modelo de reservación: confirmación manual.** El cliente envía una solicitud que queda en estado `pendiente`. El dueño o Vulcanos Tours verifican el pago y la confirman; solo entonces se bloquean las fechas. Protege contra reservas sin pago y dobles reservaciones.

---

## 2. Las dos posadas

Las dos posadas tienen **modelos de alquiler distintos**. Esta diferencia es central y determina cómo se comporta el formulario de reserva en cada una.

### 2.1 San Andrés Confort
Se alquila por apartamento individual **o** por la posada completa. Tiene 4 apartamentos, cada uno con capacidad para 7 personas (28 en total).

| Apartamento | Nombre (provisional) | Característica |
|---|---|---|
| Apartamento 1 | Amanecer | Salida hacia el garage |
| Apartamento 2 | Solana | Salida hacia el garage |
| Apartamento 3 | Atardecer | Salida hacia la piscina |
| Apartamento 4 | Ocaso | Salida hacia la piscina |

Los nombres son provisionales y deben poder cambiarse desde el panel sin afectar reservas existentes.

### 2.2 San Andrés Beach
Casa de dos pisos frente al mar, capacidad para 20 personas. **Siempre se alquila completa**, nunca por secciones. En temporada baja el precio depende del número de personas.

---

## 3. Temporadas y precios

Cuatro tipos de temporada con prioridades. Cuando las fechas caen en varias, gana la de mayor prioridad: especiales (diciembre y Semana Santa) > alta > baja.

| Temporada | Periodo | Prioridad |
|---|---|---|
| Baja | Todo el año por defecto | 1 (más baja) |
| Alta | Todo agosto y todo septiembre | 2 |
| Navidad 1 | 21 al 29 de diciembre | 3 (más alta) |
| Navidad 2 | 30 de diciembre al 10 de enero | 3 (más alta) |
| Semana Santa | Variable cada año (marzo–abril) | 3 (más alta) |

### 3.1 Precios — San Andrés Confort

| Temporada | Por apto | Completa | Mín. noches |
|---|---|---|---|
| Baja | $85 | $320 | 2 |
| Alta (ago–sep) | $100 | $400 | 3 |
| 21–29 Dic | No aplica | $400 | Por definir |
| 30 Dic–10 Ene | No aplica | $450 | Por definir |
| Semana Santa | No aplica | Por confirmar | Por confirmar |

En diciembre y Semana Santa **solo se alquila la posada completa**: el sistema oculta los apartamentos individuales cuando las fechas caen en esos periodos.

### 3.2 Precios — San Andrés Beach

| Temporada | Precio por noche | Mín. noches |
|---|---|---|
| Baja | $180 (12 pers) · $200 (16 pers) · $250 (20 pers) | 2 |
| Alta (ago–sep) | $300 (plano) | 3 |
| 21–29 Dic | $325 | 4 |
| 30 Dic–10 Ene | $325 | 4 |
| Semana Santa | Por confirmar | Por confirmar |

Solo en baja el precio varía según número de personas. En las demás temporadas es plano.

### 3.3 Reglas generales
- Check-in: 2:00 PM.
- Check-out: 12:00 del mediodía (12:00 m).
- **Comisión — un solo beneficiario:** el 10% se paga únicamente a quien consigue o contrata al cliente, sea Vulcanos Tours o un conserje. Nunca a ambos. Cada reserva tiene un único beneficiario de comisión, registrado al momento de la reserva.

---

## 4. Usuarios y roles

Cuatro tipos de usuario. Los permisos se aplican a nivel de base de datos, no solo en pantalla.

| Rol | Qué puede hacer | Qué ve |
|---|---|---|
| Dueño | Acceso total. Aprueba reservas, define precios y temporadas, ve rentabilidad. | Todo, ambas posadas consolidadas |
| Conserje | Registra gastos con recibo, ve ocupación de su posada, registra inquilinos que él trae. | Solo su posada; no ve ingresos globales |
| Vulcanos Tours | Confirma reservas que gestiona, registra pagos y canal de cobro. | Solo sus reservas y comisiones |
| Contador | Consulta y exporta reportes financieros. No modifica nada. | Finanzas completas, solo lectura |

---

## 5. La cara pública (el cliente)

### 5.1 Flujo de reserva
1. El cliente entra y elige una de las dos posadas.
2. Selecciona fechas de llegada y salida.
3. En Confort: elige apartamento o posada completa (en diciembre y Semana Santa solo aparece "completa"). En Beach: indica número de personas.
4. El sistema calcula el precio según la temporada de esas fechas y verifica disponibilidad y estadía mínima.
5. El cliente envía la solicitud → estado `pendiente`.
6. El dueño o Vulcanos verifican el pago y confirman → se bloquean las fechas.

### 5.2 Cálculo de precio (lógica)
- Determinar en qué temporada cae cada noche del rango, aplicando la de mayor prioridad.
- Validar la estadía mínima de esa temporada; si no se cumple, no permitir la reserva.
- Confort: precio = (apto o completa) × noches, según temporada.
- Beach: precio = tarifa por noche × noches; en baja la tarifa depende del número de personas.
- Restricción de diciembre y Semana Santa: en Confort solo permitir posada completa.

---

## 6. El panel administrativo

### 6.1 Reservas
Listado de todas las reservas con estado (`pendiente`, `confirmada`, `rechazada`), filtrable por posada. Las pendientes muestran el pago a verificar. Al confirmar: bloquea fechas, registra la comisión, suma el ingreso neto, marca como confirmada.

### 6.2 Gastos de mantenimiento
Cada gasto registra: posada, categoría, descripción, monto, fecha, quién lo hizo, foto del recibo (opcional). Categorías base:
- Eléctrico (cables, tomacorrientes, reparaciones eléctricas)
- Aires acondicionados
- Iluminación (bombillos)
- Pintura
- Seguridad (cerco eléctrico, cámaras)
- Reparaciones generales y otros

### 6.3 Comisiones y nómina
Tres conceptos separados:
- **Sueldo fijo de conserjes:** pago recurrente por posada.
- **Comisión a conserje:** 10% cuando el conserje consigue al huésped, ligada a una reserva.
- **Comisión a Vulcanos Tours:** 10% por gestión, ligada a la reserva. Vulcanos cobra al cliente y descuenta su comisión antes de depositar; el sistema registra monto bruto, comisión y neto al dueño.

(Recordar: por reserva hay un único beneficiario de comisión, nunca ambos.)

### 6.4 Pagos y canales de cobro
Cada pago registra por cuál canal entró el dinero: Zelle, Binance, banco en Panamá, banco en Venezuela, dólares en efectivo.

### 6.5 Reportes
Vista consolidada para el dueño: ingreso bruto, gastos por categoría y posada, comisiones, nómina, ingreso neto. Exportable para el contador.

---

## 7. Modelo de datos

| Tabla | Campos principales | Se relaciona con |
|---|---|---|
| posadas | id, nombre, tipo_alquiler, descripción | apartamentos, reservas, gastos |
| apartamentos | id, posada_id, nombre, capacidad, característica | posadas, reservas |
| temporadas | id, nombre, tipo, prioridad, fecha_inicio, fecha_fin | precios |
| precios | id, posada_id, temporada_id, modalidad, num_personas, monto, min_noches | posadas, temporadas |
| reservas | id, posada_id, apartamento_id, cliente, fecha_in, fecha_out, personas, estado, gestor | posadas, pagos, comisiones |
| pagos | id, reserva_id, monto_bruto, canal, comision, neto, fecha | reservas |
| gastos | id, posada_id, categoria, descripcion, monto, fecha, usuario_id, recibo_url | posadas, usuarios |
| comisiones | id, reserva_id, tipo, beneficiario, base, porcentaje, monto | reservas |
| nomina | id, usuario_id, posada_id, tipo, monto, periodo | usuarios, posadas |
| usuarios | id, nombre, email, rol, posada_id | posadas, gastos, nómina |

Las reservas y apartamentos se filtran por posada (independencia de cara al cliente); gastos y comisiones se consolidan (visión única del negocio).

---

## 8. Tecnología recomendada
- **Base de datos y backend:** Supabase (PostgreSQL con autenticación y permisos por rol a nivel de fila).
- **Frontend:** Next.js con React.
- **Alojamiento:** Vercel.

---

## 9. Fases de construcción
1. Base de datos y roles de usuario (cimiento).
2. Cara pública: reservas con cálculo de precio por temporada.
3. Panel de reservas con confirmación manual.
4. Módulos financieros: gastos, comisiones, pagos, reportes.

---

## 10. Decisiones pendientes de confirmar
- Precio y estadía mínima de Semana Santa (ambas posadas).
- Si Vulcanos confirma directamente o requiere visto bueno final del dueño para montos altos.
- Si se exige subir comprobante de pago antes de confirmar una reserva.
- Nombres definitivos de los apartamentos de Confort.
