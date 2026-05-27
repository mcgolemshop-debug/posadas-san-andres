# Supabase — Base de datos del sistema

Esta carpeta contiene todo el código SQL que define la base de datos en Supabase.

## Estructura

```
supabase/
├── migrations/      Cambios al esquema, numerados y aplicados en orden
└── scripts/         Scripts auxiliares (no son migraciones)
```

## Cómo aplicar las migraciones por primera vez

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) y abre el proyecto.
2. Click izquierdo en **SQL Editor** (icono `</>` en la barra lateral).
3. Para cada archivo en `migrations/`, en orden numérico (001, 002, 003…):
   - Abre el archivo en tu editor local.
   - Copia TODO su contenido.
   - Pégalo en el SQL Editor de Supabase.
   - Click en **Run** (esquina inferior derecha).
   - Espera el mensaje de éxito (`Success. No rows returned` o similar).
4. Después de las 10 migraciones, ve a **Table Editor** y verifica que ves estas 10 tablas:
   `posadas`, `apartamentos`, `usuarios`, `temporadas`, `precios`, `reservas`,
   `pagos`, `gastos`, `comisiones`, `nomina`.

## Crear los usuarios de prueba

1. **Authentication → Users → Add user** (botón verde).
2. Repite 4 veces, una por rol:

   | Email | Contraseña | Rol |
   | --- | --- | --- |
   | `dueno@test.com` | (tú eliges) | Dueño |
   | `conserje@test.com` | (tú eliges) | Conserje (Confort) |
   | `vulcanos@test.com` | (tú eliges) | Vulcanos Tours |
   | `contador@test.com` | (tú eliges) | Contador |

3. Marca **Auto Confirm User** para que no pida verificación por email.
4. Apunta las contraseñas en un gestor seguro.
5. Una vez los 4 estén creados, vuelve al **SQL Editor** y corre el script
   `scripts/seed_usuarios.sql`. Este enlaza cada email con su rol y posada
   en la tabla `public.usuarios`.

## Si necesitas cambiar el esquema más adelante

NO edites las migraciones ya aplicadas. Crea un archivo nuevo con el
siguiente número (`011_...sql`) que describa el cambio adicional.

## Verificar que RLS funciona

En el SQL Editor:

```sql
-- Debe ver SOLO las posadas activas (sin ser admin)
SELECT * FROM public.posadas;

-- Debe dar 0 filas (RLS bloquea anon de leer reservas)
SET LOCAL role = 'anon';
SELECT * FROM public.reservas;
```
