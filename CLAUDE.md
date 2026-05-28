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
- **Check-in:** 2:00 PM. **Check-out:** 12:00 m (mediodía).

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

### Bloqueantes para Fase 2/3
- [ ] **Fechas, precio y noches mínimas de Semana Santa** (variable cada año, marzo–abril).
- [ ] **Si Vulcanos confirma directamente** las reservas o requiere visto bueno del Dueño para montos altos (afecta lógica de confirmación en Fase 3).
- [ ] **Si se exige comprobante de pago** antes de confirmar una reserva (afecta el formulario en Fase 2).
- [ ] **Nombres definitivos de los apartamentos** de Confort (los actuales — Amanecer, Solana, Atardecer, Ocaso — son provisionales).

### Bloqueantes para Fase 2 operacional
- [ ] **Servicio de emails transaccionales** (propuesta: Resend, free hasta 3k/mes).
- [ ] **Datos bancarios reales** (Zelle, Binance, banco Panamá, banco Venezuela) para mostrar al cliente.

### Bloqueantes para Fase 4
- [ ] **Dominio personalizado** para el despliegue en Vercel.
- [ ] **Logo y paleta de marca** para Posadas San Andrés.

### Resueltas (28 may 2026)
- ✅ Precios Confort: $85 apto baja, $100 apto alta, $320 completa baja, $400 completa alta y Nav1, $450 Nav2.
- ✅ Precios Beach altas: $300 alta plano, $325 Nav1 y Nav2 plano.
- ✅ Estadía mínima: Baja 2 noches, Alta 3, Navidad 1 y 2 = 4.
- ✅ Características y capacidad apartamentos: 7 personas c/u (28 total). Amanecer y Solana → garage. Atardecer y Ocaso → piscina.
- ✅ Beach: capacidad 20 personas.

## 9. Estado actual

- ✅ **Fase 1 completa** (28 may 2026). Supabase: 10 tablas + RLS para 4 roles + 2 posadas, 4 apartamentos, 4 temporadas, 3 precios conocidos de Beach baja, 4 usuarios de prueba. Repo en `https://github.com/mcgolemshop-debug/posadas-san-andres`. Verificación 16/16 OK con `node --env-file=.env.local supabase/scripts/verificar-fase1.mjs`.
- ⏸ Fases 2, 3, 4 esperando aprobación.
