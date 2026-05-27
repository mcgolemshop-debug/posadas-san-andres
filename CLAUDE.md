# CLAUDE.md — Sistema Posadas San Andrés

> Este archivo es la memoria permanente del proyecto. Léelo siempre al inicio de cualquier sesión nueva.

## 1. Contexto

Sistema web de reservaciones y gestión para **dos posadas en Chichiriviche, Venezuela**:

- **San Andrés Confort** — 4 apartamentos individuales. Se alquila por apartamento o completa.
- **San Andrés Beach** — siempre se alquila completa; en temporada baja el precio depende del número de personas (12, 16 o 20).

Una sola aplicación con experiencia separada por posada de cara al cliente, panel administrativo consolidado.

- **Cliente del proyecto:** Orlando Velásquez (`velasquezorlandodavid@gmail.com`).
- **Cuenta GitHub para el repo:** `mcgolemshop@gmail.com`.
- **Idioma de la interfaz:** español. **Moneda:** USD.
- **Zona horaria del negocio:** `America/Caracas`.

## 2. Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js (App Router, TypeScript, Turbopack) |
| Estilos | Tailwind CSS |
| Base de datos + Auth | Supabase (PostgreSQL + Row Level Security) |
| Validación | Zod |
| Fechas | date-fns + date-fns-tz |
| Despliegue | Vercel (Fase 4) |
| Emails | Resend (a confirmar en Fase 2) |

## 3. Reglas de trabajo obligatorias

1. **Trabajamos por fases.** Hay 4 fases. No se avanza a la siguiente sin aprobación explícita de Orlando.
   - Fase 1: Cimiento (Supabase + auth + datos semilla).
   - Fase 2: Cara pública (cliente reserva).
   - Fase 3: Panel admin (gestión de reservas con confirmación manual).
   - Fase 4: Módulos financieros + despliegue.
2. **Habla siempre en español sencillo.** Orlando entiende tecnología pero no es programador profesional. Explica qué es y para qué sirve antes de hacer algo técnico.
3. **Antes de instalar dependencias nuevas** o **crear más de 5 archivos seguidos**, dile a Orlando qué vas a hacer y espera confirmación.
4. **Si encuentras una decisión que la especificación marca como pendiente**, NO la inventes — pregunta. La lista actual está en `ESPECIFICACION.md` sección 10.
5. **Al terminar cualquier paso significativo**, dile a Orlando exactamente qué probar y cómo (URL, botón, resultado esperado).
6. **Si necesitas que Orlando haga algo en una herramienta externa** (Supabase, Vercel, GitHub), dale instrucciones paso a paso ("abre tal sitio → haz clic en tal botón → copia tal valor → pégamelo aquí").
7. **Seguridad:** ninguna clave secreta debe quedar en el código que se sube a GitHub. Usa `.env.local` (en `.gitignore`).
8. **Comentarios en español** cuando ayuden a entender el código más adelante.

## 4. Convenciones del código

- **Idioma del código:** identificadores y nombres de variables en español (`reserva`, `apartamento`, `temporada`) salvo cuando sean términos técnicos universales (`useState`, `id`, `email`).
- **Nombres de archivos:** kebab-case para componentes (`reserva-form.tsx`), snake_case para migraciones SQL (`001_posadas_apartamentos.sql`).
- **Estado de reserva:** `pendiente` | `confirmada` | `rechazada` | `cancelada`.
- **Modalidad de reserva (Confort):** `apartamento` | `completa`.
- **Canales de pago:** `zelle` | `binance` | `banco_panama` | `banco_venezuela` | `efectivo`.
- **Categorías de gasto:** `electrico` | `aires` | `iluminacion` | `pintura` | `seguridad` | `reparaciones` | `otros`.
- **Roles:** `dueno` | `conserje` | `vulcanos` | `contador`.

## 5. Estructura del proyecto

```
.
├── CLAUDE.md                    # Este archivo
├── ESPECIFICACION.md            # Plano funcional
├── .env.local                   # NO subir a git — claves Supabase
├── .env.example                 # Plantilla pública
├── supabase/
│   └── migrations/              # SQL versionado
│       ├── 001_posadas_apartamentos.sql
│       ├── 002_temporadas_precios.sql
│       └── ...
└── src/
    ├── app/                     # Rutas Next.js (App Router)
    │   ├── page.tsx             # Home
    │   ├── posada/[slug]/       # Detalle por posada (Fase 2)
    │   └── admin/               # Panel admin (Fase 3)
    ├── components/              # Componentes compartidos
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts        # Cliente browser
    │   │   ├── server.ts        # Cliente server components
    │   │   └── admin.ts         # Cliente service_role (uso restringido)
    │   ├── pricing/             # Cálculo de precio (Fase 2)
    │   └── types/               # Tipos generados
    └── middleware.ts            # Protección de rutas (Fase 3)
```

## 6. Cómo correr el proyecto localmente

```powershell
npm install
npm run dev
```

Abre `http://localhost:3000`.

Variables de entorno requeridas en `.env.local` (ver `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 7. Roles y permisos (resumen)

| Rol | Puede ver | Puede modificar |
| --- | --- | --- |
| **Dueño** | Todo | Todo |
| **Conserje** | Solo su posada (reservas, gastos, ocupación) | Gastos y check-in de su posada |
| **Vulcanos Tours** | Sus reservas y pagos | Crear/confirmar reservas que él trajo |
| **Contador** | Todo lo financiero (lectura) | Nada (solo lectura) |

Detalle completo en `ESPECIFICACION.md` sección 5.

## 8. Decisiones pendientes (vivas)

> Actualizar esta lista a medida que Orlando dicte respuestas o surjan decisiones nuevas.

- [ ] **Precios Confort** por apartamento y completa, en todas las temporadas.
- [ ] **Precios Beach** en alta, Navidad 1 y Navidad 2.
- [ ] **Estadía mínima** por temporada.
- [ ] **Características de cada apartamento** de Confort (piscina, garage, capacidad).
- [ ] **Fechas y precio de Semana Santa** (variable cada año).
- [ ] **Comprobante de pago obligatorio** sí/no al momento de reservar (Fase 2).
- [ ] **Servicio de emails transaccionales** (probable: Resend).
- [ ] **Datos bancarios reales** (Zelle, Binance, banco Panamá, banco Venezuela) para mostrar al cliente.
- [ ] **Dominio personalizado** para el despliegue en Vercel (Fase 4).
- [ ] **Logo y paleta de marca** para Posadas San Andrés.

## 9. Estado actual

- ✅ Fase 1 en progreso.
- ⏸ Fases 2, 3, 4 esperando.
