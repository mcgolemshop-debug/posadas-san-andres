// =====================================================================
// Script: seed-usuarios.mjs
// =====================================================================
// Crea los 4 usuarios de prueba en Supabase Auth Y los enlaza con
// la tabla public.usuarios con su rol y posada.
//
// Cómo correrlo (desde la raíz del proyecto):
//   node --env-file=.env.local supabase/scripts/seed-usuarios.mjs
//
// El script es IDEMPOTENTE: si los usuarios ya existen, no falla.
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ⚠️ Contraseñas para entorno de desarrollo. NO usar en producción.
const USUARIOS = [
  {
    email: 'dueno@test.com',
    password: 'dueno1234!',
    nombre: 'Orlando Velásquez',
    rol: 'dueno',
    posada_slug: null,
  },
  {
    email: 'conserje@test.com',
    password: 'conserje1234!',
    nombre: 'Conserje Confort',
    rol: 'conserje',
    posada_slug: 'confort',
  },
  {
    email: 'vulcanos@test.com',
    password: 'vulcanos1234!',
    nombre: 'Vulcanos Tours',
    rol: 'vulcanos',
    posada_slug: null,
  },
  {
    email: 'contador@test.com',
    password: 'contador1234!',
    nombre: 'Contador',
    rol: 'contador',
    posada_slug: null,
  },
];

async function main() {
  console.log('🔌 Conectando a Supabase...');

  // 1) Obtener IDs de posadas para enlazar conserje
  const { data: posadas, error: errPosadas } = await supabase
    .from('posadas')
    .select('id, slug');
  if (errPosadas) {
    console.error('❌ No pude leer posadas:', errPosadas.message);
    process.exit(1);
  }
  const posadaIdPorSlug = Object.fromEntries(posadas.map((p) => [p.slug, p.id]));
  console.log(`✓ Encontradas ${posadas.length} posadas:`, Object.keys(posadaIdPorSlug).join(', '));

  // 2) Crear o reutilizar cada usuario en Auth
  console.log('\n👥 Creando usuarios en Auth...');
  for (const u of USUARIOS) {
    // Intentamos crear; si ya existe, lo buscamos
    let { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,  // marcamos como verificado, no pedimos confirmación por correo
    });

    if (createErr && createErr.message?.includes('already')) {
      // Buscar el existente
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw listErr;
      const existing = list.users.find((x) => x.email === u.email);
      if (!existing) throw new Error(`No pude encontrar al usuario ${u.email}`);
      u.id = existing.id;
      console.log(`  ↻ ${u.email} ya existía (id ${u.id.slice(0, 8)}…)`);
    } else if (createErr) {
      console.error(`  ❌ Falló crear ${u.email}: ${createErr.message}`);
      process.exit(1);
    } else {
      u.id = created.user.id;
      console.log(`  ✓ ${u.email} creado (id ${u.id.slice(0, 8)}…)`);
    }
  }

  // 3) Enlazar con tabla public.usuarios (upsert para que sea idempotente)
  console.log('\n🔗 Enlazando con tabla public.usuarios...');
  for (const u of USUARIOS) {
    const fila = {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      posada_id: u.posada_slug ? posadaIdPorSlug[u.posada_slug] : null,
    };
    const { error } = await supabase.from('usuarios').upsert(fila, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ Falló enlazar ${u.email}: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ✓ ${u.email} → rol=${u.rol}${u.posada_slug ? ` posada=${u.posada_slug}` : ''}`);
  }

  // 4) Verificación final
  console.log('\n🔍 Verificación final:');
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('email, nombre, rol, posada_id, posadas(slug)')
    .order('rol');
  console.table(
    usuarios.map((u) => ({
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      posada: u.posadas?.slug ?? '—',
    })),
  );

  console.log('\n✅ Listo. 4 usuarios creados y enlazados.');
  console.log('\n📋 Credenciales (apunta en tu gestor de contraseñas):');
  USUARIOS.forEach((u) => console.log(`   ${u.rol.padEnd(10)} → ${u.email} / ${u.password}`));
}

main().catch((err) => {
  console.error('\n❌ Error inesperado:', err);
  process.exit(1);
});
