// =====================================================================
// Tests del módulo de pricing
// =====================================================================
// Corre con:
//   node --test src/lib/pricing/calcular.test.mjs
//
// Como los tests están en JS plano (.mjs) y la lógica está en TS,
// importamos vía el .ts compilado-en-vuelo. Para mantenerlo simple,
// re-implementamos las funciones aquí copiando el contenido de calcular.ts
// — sí, duplica código, pero evita tener que configurar ts-loader o tsx
// solo para tests.
//
// Alternativa futura: cuando crezca, instalar vitest.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------
// Re-implementación inline (debe mantenerse en sync con calcular.ts)
// ---------------------------------------------------------------------

function enumerarNoches(fecha_inicio, fecha_fin) {
  if (fecha_fin <= fecha_inicio) return [];
  const noches = [];
  let actual = new Date(fecha_inicio + 'T12:00:00Z');
  const fin = new Date(fecha_fin + 'T12:00:00Z');
  while (actual < fin) {
    noches.push(actual.toISOString().slice(0, 10));
    actual = new Date(actual.getTime() + 24 * 60 * 60 * 1000);
  }
  return noches;
}

function determinarTemporada(fecha, temporadas) {
  const activas = temporadas.filter((t) => t.activa);
  const candidatas = activas.filter(
    (t) =>
      t.fecha_inicio !== null &&
      t.fecha_fin !== null &&
      fecha >= t.fecha_inicio &&
      fecha <= t.fecha_fin,
  );
  if (candidatas.length > 0) {
    return candidatas.reduce((mejor, t) => (t.prioridad > mejor.prioridad ? t : mejor));
  }
  return activas.find((t) => t.fecha_inicio === null && t.fecha_fin === null) ?? null;
}

function buscarPrecio(precios, posada_id, temporada_id, modalidad, num_personas) {
  const activos = precios.filter((p) => p.activo);
  const exacto = activos.find(
    (p) =>
      p.posada_id === posada_id &&
      p.temporada_id === temporada_id &&
      p.modalidad === modalidad &&
      p.num_personas === num_personas,
  );
  if (exacto) return exacto.precio_usd;
  const plano = activos.find(
    (p) =>
      p.posada_id === posada_id &&
      p.temporada_id === temporada_id &&
      p.modalidad === modalidad &&
      p.num_personas === null,
  );
  return plano ? plano.precio_usd : null;
}

// Versión simplificada de calcularPrecioReserva para los tests
function calcular(params) {
  const noches_fechas = enumerarNoches(params.fecha_inicio, params.fecha_fin);
  const advertencias = [];
  let tiene_errores = false;

  if (noches_fechas.length === 0) {
    return { total_usd: 0, cantidad_noches: 0, noches: [], advertencias: ['fechas inválidas'], tiene_errores: true, cumple_estadia_minima: false, estadia_minima_exigida: 0 };
  }

  const noches = [];
  for (const fecha of noches_fechas) {
    const temp = determinarTemporada(fecha, params.temporadas);
    if (!temp) { tiene_errores = true; continue; }
    if (params.posada_slug === 'confort' && params.modalidad === 'apartamento' && temp.fuerza_completa_confort) {
      tiene_errores = true;
      if (!advertencias.some(a => a.includes(temp.nombre))) {
        advertencias.push(`En "${temp.nombre}" la posada Confort solo se alquila completa.`);
      }
    }
    const precio = buscarPrecio(params.precios, params.posada_id, temp.id, params.modalidad, params.num_personas);
    if (precio === null) { tiene_errores = true; continue; }
    noches.push({ fecha, temporada_id: temp.id, temporada_nombre: temp.nombre, precio_usd: precio });
  }

  const tempsTocadas = new Set(noches.map(n => n.temporada_id));
  const estadia_minima_exigida = Array.from(tempsTocadas).reduce((max, id) => {
    const t = params.temporadas.find(x => x.id === id);
    return t ? Math.max(max, t.estadia_minima_noches) : max;
  }, 1);

  return {
    total_usd: noches.reduce((s, n) => s + n.precio_usd, 0),
    cantidad_noches: noches_fechas.length,
    noches,
    estadia_minima_exigida,
    cumple_estadia_minima: noches_fechas.length >= estadia_minima_exigida,
    advertencias,
    tiene_errores,
  };
}

// ---------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------

const POSADA_CONFORT = 'p-confort';
const POSADA_BEACH = 'p-beach';

const TEMPORADAS = [
  { id: 't-baja', nombre: 'Baja', prioridad: 1, estadia_minima_noches: 2, fuerza_completa_confort: false, fecha_inicio: null, fecha_fin: null, activa: true },
  { id: 't-alta', nombre: 'Alta 2026', prioridad: 2, estadia_minima_noches: 3, fuerza_completa_confort: false, fecha_inicio: '2026-08-01', fecha_fin: '2026-09-30', activa: true },
  { id: 't-nav1', nombre: 'Navidad 1 (2026)', prioridad: 3, estadia_minima_noches: 4, fuerza_completa_confort: true, fecha_inicio: '2026-12-21', fecha_fin: '2026-12-29', activa: true },
  { id: 't-nav2', nombre: 'Navidad 2 (2026-2027)', prioridad: 3, estadia_minima_noches: 4, fuerza_completa_confort: true, fecha_inicio: '2026-12-30', fecha_fin: '2027-01-10', activa: true },
];

const PRECIOS = [
  // Confort
  { posada_id: POSADA_CONFORT, temporada_id: 't-baja', modalidad: 'apartamento', num_personas: null, precio_usd: 85, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-baja', modalidad: 'completa', num_personas: null, precio_usd: 320, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-alta', modalidad: 'apartamento', num_personas: null, precio_usd: 100, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-alta', modalidad: 'completa', num_personas: null, precio_usd: 400, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-nav1', modalidad: 'completa', num_personas: null, precio_usd: 400, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-nav2', modalidad: 'completa', num_personas: null, precio_usd: 450, activo: true },
  // Beach
  { posada_id: POSADA_BEACH, temporada_id: 't-baja', modalidad: 'completa', num_personas: 12, precio_usd: 180, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-baja', modalidad: 'completa', num_personas: 16, precio_usd: 200, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-baja', modalidad: 'completa', num_personas: 20, precio_usd: 250, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-alta', modalidad: 'completa', num_personas: null, precio_usd: 300, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-nav1', modalidad: 'completa', num_personas: null, precio_usd: 325, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-nav2', modalidad: 'completa', num_personas: null, precio_usd: 325, activo: true },
];

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

test('enumerarNoches devuelve [) — la noche del check-out no se cuenta', () => {
  assert.deepEqual(enumerarNoches('2026-06-01', '2026-06-04'), [
    '2026-06-01', '2026-06-02', '2026-06-03',
  ]);
});

test('enumerarNoches con misma fecha o fecha inválida → array vacío', () => {
  assert.deepEqual(enumerarNoches('2026-06-01', '2026-06-01'), []);
  assert.deepEqual(enumerarNoches('2026-06-05', '2026-06-01'), []);
});

test('determinarTemporada: fecha en julio → Baja', () => {
  const t = determinarTemporada('2026-07-15', TEMPORADAS);
  assert.equal(t.nombre, 'Baja');
});

test('determinarTemporada: fecha en septiembre → Alta', () => {
  const t = determinarTemporada('2026-09-10', TEMPORADAS);
  assert.equal(t.nombre, 'Alta 2026');
});

test('determinarTemporada: fecha en Navidad → Navidad 1', () => {
  const t = determinarTemporada('2026-12-25', TEMPORADAS);
  assert.equal(t.nombre, 'Navidad 1 (2026)');
});

test('Confort en baja, 5 noches por apartamento → 5 × $85 = $425', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-06',
    modalidad: 'apartamento', num_personas: 4,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.tiene_errores, false);
  assert.equal(r.total_usd, 425);
  assert.equal(r.cantidad_noches, 5);
  assert.equal(r.cumple_estadia_minima, true);
});

test('Beach baja con 16 personas, 3 noches → 3 × $200 = $600', () => {
  const r = calcular({
    posada_slug: 'beach', posada_id: POSADA_BEACH,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-04',
    modalidad: 'completa', num_personas: 16,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.tiene_errores, false);
  assert.equal(r.total_usd, 600);
});

test('Cruce baja → alta: 1 noche baja ($85) + 4 noches alta ($100) = $485', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-07-31', fecha_fin: '2026-08-05',
    modalidad: 'apartamento', num_personas: 4,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.tiene_errores, false);
  assert.equal(r.total_usd, 85 + 100 * 4);
  // Estadía mínima: la más alta de las temporadas tocadas (alta=3)
  assert.equal(r.estadia_minima_exigida, 3);
  assert.equal(r.cumple_estadia_minima, true);
});

test('Confort en Navidad con modalidad apartamento → error bloqueante', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-12-23', fecha_fin: '2026-12-28',
    modalidad: 'apartamento', num_personas: 4,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.tiene_errores, true);
  assert.ok(r.advertencias.some(a => a.includes('Navidad')));
});

test('Confort completa en Navidad 2 (cruza año), 5 noches → 5 × $450 = $2250', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-12-30', fecha_fin: '2027-01-04',
    modalidad: 'completa', num_personas: 20,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.tiene_errores, false);
  assert.equal(r.total_usd, 2250);
});

test('Reserva de 1 noche en baja → no cumple estadía mínima (2)', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-02',
    modalidad: 'apartamento', num_personas: 4,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.cumple_estadia_minima, false);
  assert.equal(r.estadia_minima_exigida, 2);
});

test('Beach alta plano $300 sin importar personas (ignora num_personas en lookup)', () => {
  const r = calcular({
    posada_slug: 'beach', posada_id: POSADA_BEACH,
    fecha_inicio: '2026-08-15', fecha_fin: '2026-08-18',
    modalidad: 'completa', num_personas: 14,  // 14 no coincide con tier
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.tiene_errores, false);
  assert.equal(r.total_usd, 900); // 3 × $300
});
