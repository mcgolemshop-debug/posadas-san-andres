// =====================================================================
// Verificación final de Fase 1
// =====================================================================
// Comprueba que:
//   - Las 10 tablas existen y tienen las filas semilla esperadas
//   - Los 4 usuarios están enlazados con su rol
//   - RLS bloquea efectivamente a anon en tablas privadas
//   - La conexión auth funciona (login con dueno@test.com)
//
// Uso:
//   node --env-file=.env.local supabase/scripts/verificar-fase1.mjs
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('❌ Faltan claves en .env.local');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;

function ok(msg) { console.log(`  ✅ ${msg}`); pass++; }
function bad(msg) { console.log(`  ❌ ${msg}`); fail++; }

async function main() {
  console.log('\n📊 1. Tablas y datos semilla\n');

  // posadas: 2 filas
  const { data: posadas } = await admin.from('posadas').select('*');
  if (posadas?.length === 2 && posadas.find(p => p.slug === 'confort') && posadas.find(p => p.slug === 'beach')) {
    ok(`posadas: 2 filas (confort, beach)`);
  } else bad(`posadas: ${posadas?.length ?? 0} filas (esperaba 2)`);

  // apartamentos: 4 filas en Confort con capacidad 7 y características asignadas
  const { data: aptos } = await admin
    .from('apartamentos')
    .select('nombre, capacidad, caracteristica')
    .order('orden');
  if (aptos?.length === 4 && aptos.every(a => a.capacidad === 7)) {
    ok(`apartamentos: 4 filas, todos capacidad 7 (${aptos.map(a => `${a.nombre}/${a.caracteristica}`).join(', ')})`);
  } else bad(`apartamentos: ${aptos?.length ?? 0} filas o capacidades incorrectas`);

  // temporadas: 4 filas con estadía mínima correcta
  const { data: temps } = await admin
    .from('temporadas')
    .select('nombre, estadia_minima_noches')
    .order('prioridad');
  const minEsperado = { 'Baja': 2, 'Alta 2026': 3, 'Navidad 1 (2026)': 4, 'Navidad 2 (2026-2027)': 4 };
  if (temps?.length === 4 && temps.every(t => t.estadia_minima_noches === minEsperado[t.nombre])) {
    ok(`temporadas: 4 filas con noches mínimas correctas (${temps.map(t => `${t.nombre}:${t.estadia_minima_noches}n`).join(', ')})`);
  } else bad(`temporadas: ${temps?.length ?? 0} filas o estadías incorrectas`);

  // precios: 12 filas totales
  const { data: precios } = await admin.from('precios').select('precio_usd');
  if (precios?.length === 12) ok(`precios: 12 filas (3 Beach baja + 3 Beach altas + 6 Confort)`);
  else bad(`precios: ${precios?.length ?? 0} filas (esperaba 12)`);

  // tablas vacías
  for (const tabla of ['reservas', 'pagos', 'gastos', 'comisiones', 'nomina']) {
    const { count, error } = await admin.from(tabla).select('*', { count: 'exact', head: true });
    if (error) bad(`${tabla}: error ${error.message}`);
    else if (count === 0) ok(`${tabla}: vacía (correcto al iniciar)`);
    else bad(`${tabla}: ${count} filas (esperaba 0)`);
  }

  console.log('\n👥 2. Usuarios\n');
  const { data: usuarios } = await admin.from('usuarios').select('email, rol');
  const esperados = ['dueno', 'conserje', 'vulcanos', 'contador'];
  const encontrados = usuarios?.map(u => u.rol).sort() ?? [];
  if (JSON.stringify(encontrados.sort()) === JSON.stringify(esperados.sort())) {
    ok(`4 usuarios con roles: ${encontrados.join(', ')}`);
  } else bad(`Usuarios encontrados: ${encontrados.join(', ')} (esperaba ${esperados.join(', ')})`);

  console.log('\n🔒 3. Row Level Security (anon NO debe poder leer datos sensibles)\n');

  // anon SÍ puede ver posadas activas
  const { data: anonPosadas, error: anonPosadasErr } = await anon.from('posadas').select('slug');
  if (!anonPosadasErr && anonPosadas?.length === 2) {
    ok(`anon puede leer posadas activas (lo necesita para la home pública)`);
  } else bad(`anon NO puede leer posadas: ${anonPosadasErr?.message ?? 'sin datos'}`);

  // anon NO puede ver reservas (no hay policy SELECT para anon en reservas)
  const { data: anonReservas, error: anonReservasErr } = await anon.from('reservas').select('id');
  // Con RLS habilitado y sin policy SELECT, Postgres devuelve [] (no error)
  if ((anonReservas?.length ?? 0) === 0) {
    ok(`anon NO puede leer reservas (RLS bloquea correctamente)`);
  } else bad(`anon LEYÓ ${anonReservas.length} reservas (RLS no funciona)`);

  // anon NO puede ver usuarios
  const { data: anonUsuarios } = await anon.from('usuarios').select('id');
  if ((anonUsuarios?.length ?? 0) === 0) {
    ok(`anon NO puede leer usuarios (RLS bloquea correctamente)`);
  } else bad(`anon LEYÓ ${anonUsuarios.length} usuarios (RLS no funciona)`);

  // anon SÍ puede leer precios activos (necesita para mostrar precios en la home)
  const { data: anonPrecios } = await anon.from('precios').select('precio_usd');
  if ((anonPrecios?.length ?? 0) === 12) {
    ok(`anon puede leer precios activos (necesario para mostrar tarifas)`);
  } else bad(`anon precios: ${anonPrecios?.length} filas (esperaba 12)`);

  console.log('\n🔑 4. Auth — login con cuenta dueño\n');
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
    email: 'dueno@test.com',
    password: 'dueno1234!',
  });
  if (signInErr) bad(`Login dueno: ${signInErr.message}`);
  else ok(`Login dueno OK (token ${signIn.session.access_token.slice(0, 20)}...)`);

  // Ahora como dueño debería ver reservas (aunque estén vacías) sin error
  if (signIn?.session) {
    const duenoClient = createClient(URL, ANON, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    });
    const { error: errDuenoRes } = await duenoClient.from('reservas').select('id');
    if (!errDuenoRes) ok(`Como Dueño, SELECT en reservas funciona (sin error)`);
    else bad(`Como Dueño falla: ${errDuenoRes.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Resultado: ${pass} OK, ${fail} fallos`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => { console.error('Error fatal:', err); process.exit(1); });
