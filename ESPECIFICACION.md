# ESPECIFICACIÓN — Sistema Posadas San Andrés

Plano funcional completo. Esta es la fuente de verdad sobre **qué** debe hacer el sistema. El **cómo** (decisiones técnicas) está en `CLAUDE.md`.

> Las decisiones marcadas con `> ⚠️ PENDIENTE` deben preguntarse a Orlando antes de implementarse — nunca inventar.

---

## 1. Las dos posadas

### 1.1 San Andrés Confort

- Posada con **4 apartamentos independientes**.
- Modalidades de alquiler:
  - **Apartamento individual** — un cliente reserva un apto específico; los demás siguen disponibles.
  - **Posada completa** — un solo cliente alquila los 4 apartamentos a la vez. Bloquea todos los demás.
- **Restricción especial:** en **diciembre completo** (21 dic – 10 ene) y **Semana Santa**, solo se alquila completa. La UI debe ocultar la opción de apartamento individual cuando las fechas caigan en esos rangos.

### 1.2 San Andrés Beach

- Siempre se alquila **completa** (no hay subdivisión por apartamento).
- En **temporada baja**, el precio depende del número de personas:
  - 12 personas → 180 USD/noche
  - 16 personas → 200 USD/noche
  - 20 personas → 250 USD/noche
- En temporadas altas el precio es plano por noche (sin variar por personas).

---

## 2. Apartamentos (Confort)

Nombres provisionales — Orlando los confirmará/cambiará desde el panel admin (Fase 3).

| ID interno | Nombre | Característica | Capacidad |
| --- | --- | --- | --- |
| 1 | Amanecer | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE |
| 2 | Solana | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE |
| 3 | Atardecer | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE |
| 4 | Ocaso | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE |

> ⚠️ PENDIENTE: Definir cuál tiene piscina, cuál tiene garage, capacidad de cada uno, fotos.

---

## 3. Temporadas y precios

### 3.0 Temporadas

| Temporada | Rango de fechas | Prioridad |
| --- | --- | --- |
| **Baja** | Cualquier fecha que no caiga en otra | 1 (más baja) |
| **Alta** | 1 ago – 30 sep | 2 |
| **Navidad 1** | 21 dic – 29 dic | 3 |
| **Navidad 2** | 30 dic – 10 ene (cruza año) | 3 |
| **Semana Santa** | Variable cada año | 3 |

**Regla:** si un rango de noches cruza dos temporadas, el precio se calcula **prorrateado noche por noche** — cada noche cobra el precio de su temporada. La validación de estadía mínima usa la temporada de **mayor peso** del rango.

> ⚠️ PENDIENTE: Estadía mínima por temporada (¿1 noche en baja? ¿3 en alta? ¿5 en Navidad?).

### 3.1 Precios de Confort (USD por noche)

| Modalidad | Baja | Alta | Navidad 1 | Navidad 2 | Semana Santa |
| --- | --- | --- | --- | --- | --- |
| Apartamento individual | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | N/A (solo completa) | N/A (solo completa) | N/A (solo completa) |
| Posada completa | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE |

### 3.2 Precios de Beach (USD por noche)

| Capacidad | Baja | Alta | Navidad 1 | Navidad 2 | Semana Santa |
| --- | --- | --- | --- | --- | --- |
| 12 personas | **180** | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE |
| 16 personas | **200** | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE |
| 20 personas | **250** | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE | > ⚠️ PENDIENTE |

> En temporadas altas, ¿el precio sigue dependiendo de la cantidad de personas o es un único precio por noche? → ⚠️ PENDIENTE.

---

## 4. Flujo de reservación

### 4.1 Estados

```
[pendiente] ──confirma──> [confirmada]
     │                         │
     ├──rechaza──> [rechazada] │
     │                         ├──cancela──> [cancelada]
     └──cancela──> [cancelada]
```

- Toda reserva nueva nace en `pendiente`.
- Solo Dueño y Vulcanos pueden confirmar/rechazar.
- Una reserva `confirmada` bloquea las fechas; las demás no.

### 4.2 Validación de fechas

- Una reserva `confirmada` impide otra `confirmada` en el mismo apartamento con fechas que se solapen.
- En Confort: si se confirma "posada completa" → ningún apartamento individual puede tener reserva confirmada en esas fechas (y viceversa).

### 4.3 Cálculo de precio (módulo backend)

**Entrada:** posada, fecha inicio, fecha fin, modalidad, apartamento (si aplica), número de personas (Beach).

**Proceso:**
1. Enumerar cada noche del rango (desde `inicio` hasta `fin - 1 día`).
2. Para cada noche, determinar la temporada aplicable (regla de prioridad).
3. Multiplicar por el precio de esa temporada/modalidad/personas.
4. Sumar todas las noches.

**Salida:** total USD, desglose por noche, temporada(s) aplicada(s), advertencias (ej.: "estadía mínima no cumplida").

### 4.4 Confort en diciembre y Semana Santa

Si **cualquier noche** del rango cae en 21 dic – 10 ene o en Semana Santa, **forzar modalidad = completa**. La UI no debe mostrar "apartamento individual" en esos casos.

---

## 5. Roles y permisos

| Acción | Dueño | Conserje | Vulcanos | Contador |
| --- | :-: | :-: | :-: | :-: |
| Ver reservas de todas las posadas | ✅ | ❌ (solo su posada) | ❌ (solo las suyas) | ✅ |
| Confirmar/rechazar reserva | ✅ | ❌ | ✅ (las suyas) | ❌ |
| Crear reserva (por teléfono/WhatsApp) | ✅ | ✅ (su posada) | ✅ | ❌ |
| Ver ingresos consolidados | ✅ | ❌ | ❌ | ✅ |
| Registrar gasto | ✅ | ✅ (su posada) | ❌ | ❌ |
| Ver nómina | ✅ | ❌ | ❌ | ✅ |
| Modificar nómina | ✅ | ❌ | ❌ | ❌ |
| Editar precios y temporadas | ✅ | ❌ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |
| Ver/cobrar sus comisiones | ✅ | ✅ (las suyas) | ✅ (las suyas) | ✅ (todas, lectura) |

Estos permisos se imponen **a nivel de base de datos** vía Row Level Security de Supabase, no solo en el frontend.

---

## 6. Comisiones

- **Tasa fija:** 10% sobre el bruto de la reserva.
- **Beneficiario:** UN solo beneficiario por reserva (Vulcanos Tours **o** el conserje que trajo al huésped). **Nunca a ambos.**
- El Dueño **no** se paga comisión a sí mismo cuando es él quien gestiona la reserva directamente — en ese caso no se genera registro de comisión.
- Cuando Vulcanos cobra al cliente y descuenta su comisión antes de depositar al Dueño, se registra: `bruto`, `comisión`, `neto al dueño`.
- La comisión nace en estado `pendiente` y se marca `pagada` cuando se cancela.

---

## 7. Modelo de datos (10 tablas)

> Detalle de columnas y tipos en `supabase/migrations/`. Resumen aquí.

| # | Tabla | Propósito |
| --- | --- | --- |
| 1 | `posadas` | Las dos posadas. Slug, nombre, descripción, tipo_alquiler. |
| 2 | `apartamentos` | Los 4 de Confort. FK a posadas. |
| 3 | `temporadas` | Baja, Alta, Navidad 1, Navidad 2, Semana Santa. Rangos de fechas. |
| 4 | `precios` | Precio por posada + apartamento (opcional) + temporada + num_personas (opcional). |
| 5 | `reservas` | Estado, fechas, cliente, modalidad, total, gestor. **Exclusion constraint** anti-solape. |
| 6 | `pagos` | Canal, bruto, comisión, neto, comprobante. FK a reserva. |
| 7 | `gastos` | Categoría, monto, fecha, recibo. FK a posada. |
| 8 | `comisiones` | Beneficiario, porcentaje, monto, estado. FK a reserva. |
| 9 | `nomina` | Conserje, posada, periodo, monto. |
| 10 | `usuarios` | Extiende `auth.users` con `rol` y `posada_id`. |

---

## 8. Canales de pago

| Canal | Datos a mostrar al cliente |
| --- | --- |
| Zelle | > ⚠️ PENDIENTE (email/teléfono titular, nombre) |
| Binance | > ⚠️ PENDIENTE (Binance ID o billetera USDT) |
| Banco Panamá | > ⚠️ PENDIENTE (banco, cuenta, titular) |
| Banco Venezuela | > ⚠️ PENDIENTE (banco, cuenta, cédula titular) |
| Efectivo | Coordinar con la posada (mostrar teléfono de contacto) |

---

## 9. Emails de confirmación

- **Al enviar solicitud de reserva** (estado `pendiente`):
  - Cliente recibe: "Tu solicitud fue recibida. Te confirmaremos en X horas. Datos de pago: ..."
  - Dueño recibe: "Nueva solicitud de reserva en posada Y."
- **Al confirmar reserva:**
  - Cliente recibe: "Tu reserva está confirmada. Bienvenido a Posadas San Andrés."
- **Al rechazar reserva:**
  - Cliente recibe: "Lo sentimos, no pudimos confirmar tu reserva. Motivo: ..."

> ⚠️ PENDIENTE: Servicio de envío (Resend probable). Diseño visual de los emails.

---

## 10. Decisiones pendientes consolidadas

Lista viva. Marcada también en `CLAUDE.md` sección 8.

### Precios y temporadas
- [ ] Precios Confort: apartamento individual baja y alta.
- [ ] Precios Confort: posada completa en las 4 temporadas (+ Semana Santa).
- [ ] Precios Beach: alta, Navidad 1, Navidad 2 (12/16/20 personas en cada una).
- [ ] ¿Beach en temporadas altas también varía por personas, o precio plano?
- [ ] Estadía mínima por temporada (en noches).
- [ ] Fechas y precio de Semana Santa 2026 (y forma de actualizarla cada año).

### Operación
- [ ] Comprobante de pago obligatorio sí/no al reservar.
- [ ] Datos bancarios reales de los 4 canales de pago.
- [ ] Servicio de emails transaccionales.

### Apartamentos
- [ ] Características de cada apto (piscina, garage, capacidad).
- [ ] Nombres definitivos.
- [ ] Fotos.

### Despliegue
- [ ] Dominio personalizado.
- [ ] Logo y paleta de marca.
