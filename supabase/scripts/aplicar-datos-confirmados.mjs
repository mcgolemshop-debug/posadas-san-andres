// =====================================================================
// Script: aplicar-datos-confirmados.mjs
// =====================================================================
// Aplica los datos que Orlando confirmó el 28 may 2026, equivalente a
// correr la migración 011_datos_confirmados.sql. Idempotente:
// se puede volver a correr sin causar duplicados.
//
// Uso:
//   node --env-file=.env.local supabase/scripts/aplicar-datos-confirmados.mjs
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error('❌ Faltan claves en .env.local');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

async function main() {
  console.log('🔌 Conectado a Supabase\n');

  // --------------------------------------------------------------------
  // 1) Apartamentos: capacidad y característica
  // --------------------------------------------------------------------
  console.log('🏠 Actualizando apartamentos…');
  const aptos = [
    { nombre: 'Amanecer',  capacidad: 7, caracteristica: 'garage'  },
    { nombre: 'Solana',    capacidad: 7, caracteristica: 'garage'  },
    { nombre: 'Atardecer', capacidad: 7, caracteristica: 'piscina' },
    { nombre: 'Ocaso',     capacidad: 7, caracteristica: 'piscina' },
  ];
  for (const a of aptos) {
    const { error } = await admin
      .from('apartamentos')
      .update({ capacidad: a.capacidad, caracteristica: a.caracteristica })
      .eq('nombre', a.nombre);
    if (error) { console.error(`  ❌ ${a.nombre}: ${error.message}`); process.exit(1); }
    console.log(`  ✓ ${a.nombre}: capacidad=${a.capacidad}, característica=${a.caracteristica}`);
  }

  // --------------------------------------------------------------------
  // 2) Posadas: descripciones afinadas
  // --------------------------------------------------------------------
  console.log('\n🏡 Actualizando descripciones de posadas…');
  const posadasUpdates = [
    {
      slug: 'confort',
      descripcion: 'Posada con 4 apartamentos independientes en Chichiriviche. Cada apartamento aloja hasta 7 personas (28 en total). Se alquila por apartamento o completa.',
    },
    {
      slug: 'beach',
      descripcion: 'Casa de dos pisos frente al mar en Chichiriviche. Capacidad para 20 personas. Siempre se alquila completa; en temporada baja el precio depende del número de personas.',
    },
  ];
  for (const p of posadasUpdates) {
    const { error } = await admin
      .from('posadas')
      .update({ descripcion: p.descripcion })
      .eq('slug', p.slug);
    if (error) { console.error(`  ❌ ${p.slug}: ${error.message}`); process.exit(1); }
    console.log(`  ✓ ${p.slug}`);
  }

  // --------------------------------------------------------------------
  // 3) Temporadas: estadía mínima
  // --------------------------------------------------------------------
  console.log('\n📅 Actualizando estadías mínimas…');
  const minNoches = [
    { nombre: 'Baja',                  noches: 2 },
    { nombre: 'Alta 2026',             noches: 3 },
    { nombre: 'Navidad 1 (2026)',      noches: 4 },
    { nombre: 'Navidad 2 (2026-2027)', noches: 4 },
  ];
  for (const t of minNoches) {
    const { error } = await admin
      .from('temporadas')
      .update({ estadia_minima_noches: t.noches })
      .eq('nombre', t.nombre);
    if (error) { console.error(`  ❌ ${t.nombre}: ${error.message}`); process.exit(1); }
    console.log(`  ✓ ${t.nombre}: ${t.noches} noches mínimo`);
  }

  // --------------------------------------------------------------------
  // 4) Precios nuevos
  // --------------------------------------------------------------------
  console.log('\n💵 Insertando precios confirmados…');

  // Obtener IDs de posadas y temporadas
  const { data: posadas } = await admin.from('posadas').select('id, slug');
  const { data: temporadas } = await admin.from('temporadas').select('id, nombre');
  const idPosada = Object.fromEntries(posadas.map(p => [p.slug, p.id]));
  const idTemp = Object.fromEntries(temporadas.map(t => [t.nombre, t.id]));

  const nuevosPrecios = [
    // Confort
    { posada: 'confort', temp: 'Baja',                  mod: 'apartamento', pers: null, usd: 85 },
    { posada: 'confort', temp: 'Baja',                  mod: 'completa',    pers: null, usd: 320 },
    { posada: 'confort', temp: 'Alta 2026',             mod: 'apartamento', pers: null, usd: 100 },
    { posada: 'confort', temp: 'Alta 2026',             mod: 'completa',    pers: null, usd: 400 },
    { posada: 'confort', temp: 'Navidad 1 (2026)',      mod: 'completa',    pers: null, usd: 400 },
    { posada: 'confort', temp: 'Navidad 2 (2026-2027)', mod: 'completa',    pers: null, usd: 450 },
    // Beach (en altas, precio plano)
    { posada: 'beach',   temp: 'Alta 2026',             mod: 'completa',    pers: null, usd: 300 },
    { posada: 'beach',   temp: 'Navidad 1 (2026)',      mod: 'completa',    pers: null, usd: 325 },
    { posada: 'beach',   temp: 'Navidad 2 (2026-2027)', mod: 'completa',    pers: null, usd: 325 },
  ];

  for (const p of nuevosPrecios) {
    const fila = {
      posada_id: idPosada[p.posada],
      temporada_id: idTemp[p.temp],
      modalidad: p.mod,
      num_personas: p.pers,
      precio_usd: p.usd,
    };
    // upsert con onConflict basado en la unique constraint
    const { error } = await admin
      .from('precios')
      .upsert(fila, { onConflict: 'posada_id,temporada_id,modalidad,num_personas' });
    if (error) {
      console.error(`  ❌ ${p.posada}/${p.temp}/${p.mod}: ${error.message}`);
      process.exit(1);
    }
    const pax = p.pers ? `${p.pers}pax` : 'plano';
    console.log(`  ✓ ${p.posada.padEnd(7)} × ${p.temp.padEnd(24)} × ${p.mod.padEnd(11)} (${pax}) → $${p.usd}`);
  }

  // --------------------------------------------------------------------
  // Verificación
  // --------------------------------------------------------------------
  console.log('\n🔍 Verificación final:');
  const { data: precios } = await admin
    .from('precios')
    .select('precio_usd, modalidad, num_personas, posadas(slug), temporadas(nombre)')
    .order('precio_usd');
  console.log(`  Total precios en BD: ${precios.length}`);
  console.table(
    precios.map(p => ({
      posada: p.posadas.slug,
      temporada: p.temporadas.nombre,
      modalidad: p.modalidad,
      pax: p.num_personas ?? '—',
      precio: '$' + p.precio_usd,
    })),
  );

  console.log('\n✅ Datos confirmados aplicados.');
}

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
