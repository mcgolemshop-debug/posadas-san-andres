// =====================================================================
// Tests del módulo de pricing
// =====================================================================
// Corre con:
//   node --test src/lib/pricing/calcular.test.mjs
//
// Reimplementamos las funciones inline (sin TS) — debe mantenerse en
// sync con calcular.ts.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------
// Re-implementación inline (en sync con calcular.ts)
// ---------------------------------------------------------------------

function enumerarNoches(fi, ff) {
  if (ff <= fi) return [];
  const out = [];
  let a = new Date(fi + 'T12:00:00Z');
  const f = new Date(ff + 'T12:00:00Z');
  while (a < f) {
    out.push(a.toISOString().slice(0, 10));
    a = new Date(a.getTime() + 86400000);
  }
  return out;
}

function determinarTemporada(fecha, temps) {
  const activas = temps.filter((t) => t.activa);
  const cand = activas.filter(
    (t) => t.fecha_inicio !== null && t.fecha_fin !== null && fecha >= t.fecha_inicio && fecha <= t.fecha_fin,
  );
  if (cand.length > 0) {
    return cand.reduce((m, t) => (t.prioridad > m.prioridad ? t : m));
  }
  return activas.find((t) => t.fecha_inicio === null && t.fecha_fin === null) ?? null;
}

function buscarPrecio(precios, pid, tid, mod, np) {
  const act = precios.filter((p) => p.activo);
  const ex = act.find(
    (p) => p.posada_id === pid && p.temporada_id === tid && p.modalidad === mod && p.num_personas === np,
  );
  if (ex) return ex.precio_usd;
  const pl = act.find(
    (p) => p.posada_id === pid && p.temporada_id === tid && p.modalidad === mod && p.num_personas === null,
  );
  return pl ? pl.precio_usd : null;
}

function calcular(p) {
  const cantApt = Math.max(1, p.cantidad_apartamentos ?? 1);
  const extras = Math.max(0, p.num_personas_extras ?? 0);
  const serv = Math.max(0, p.servicio_extra_usd ?? 0);
  const desc = Math.max(0, p.descuento_usd ?? 0);

  const fechas = enumerarNoches(p.fecha_inicio, p.fecha_fin);
  const adv = [];
  let err = false;
  if (fechas.length === 0) {
    return { subtotal_usd: 0, extras_personas_usd: 0, servicio_extra_usd: serv, descuento_usd: desc, total_usd: 0, cantidad_noches: 0, noches: [], temporadas_aplicadas: [], estadia_minima_exigida: 0, cumple_estadia_minima: false, advertencias: ['fechas inválidas'], tiene_errores: true };
  }
  const noches = [];
  for (const fecha of fechas) {
    const temp = determinarTemporada(fecha, p.temporadas);
    if (!temp) { err = true; continue; }
    if (p.posada_slug === 'confort' && p.modalidad === 'apartamento' && temp.fuerza_completa_confort) {
      err = true;
      if (!adv.some((a) => a.includes(temp.nombre))) adv.push(`En "${temp.nombre}" Confort solo completa.`);
    }
    const precio = buscarPrecio(p.precios, p.posada_id, temp.id, p.modalidad, p.num_personas);
    if (precio === null) { err = true; continue; }
    noches.push({ fecha, temporada_id: temp.id, temporada_nombre: temp.nombre, precio_usd: precio, costo_extra_persona_usd: temp.costo_extra_persona_usd ?? 0 });
  }
  const tt = new Set(noches.map((n) => n.temporada_id));
  const minN = Array.from(tt).reduce((m, id) => {
    const t = p.temporadas.find((x) => x.id === id);
    return t ? Math.max(m, t.estadia_minima_noches) : m;
  }, 1);
  const subtotal = noches.reduce((s, n) => s + n.precio_usd, 0) * cantApt;
  const extrasUSD = noches.reduce((s, n) => s + extras * n.costo_extra_persona_usd, 0);
  const totalSinDesc = subtotal + extrasUSD + serv;
  const total = Math.max(0, totalSinDesc - desc);
  if (desc > totalSinDesc) {
    adv.push(`El descuento ($${desc}) es mayor que el total ($${totalSinDesc}).`);
  }
  return {
    subtotal_usd: subtotal,
    extras_personas_usd: extrasUSD,
    servicio_extra_usd: serv,
    descuento_usd: desc,
    total_usd: total,
    cantidad_noches: fechas.length,
    noches,
    estadia_minima_exigida: minN,
    cumple_estadia_minima: fechas.length >= minN,
    advertencias: adv,
    tiene_errores: err,
  };
}

// ---------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------

const POSADA_CONFORT = 'p-confort';
const POSADA_BEACH = 'p-beach';

const TEMPORADAS = [
  { id: 't-baja', nombre: 'Baja', prioridad: 1, estadia_minima_noches: 2, fuerza_completa_confort: false, costo_extra_persona_usd: 15, fecha_inicio: null, fecha_fin: null, activa: true },
  { id: 't-alta', nombre: 'Alta 2026', prioridad: 2, estadia_minima_noches: 3, fuerza_completa_confort: false, costo_extra_persona_usd: 20, fecha_inicio: '2026-08-01', fecha_fin: '2026-09-30', activa: true },
  { id: 't-nav1', nombre: 'Navidad 1 (2026)', prioridad: 3, estadia_minima_noches: 4, fuerza_completa_confort: true, costo_extra_persona_usd: 20, fecha_inicio: '2026-12-21', fecha_fin: '2026-12-29', activa: true },
  { id: 't-nav2', nombre: 'Navidad 2 (2026-2027)', prioridad: 3, estadia_minima_noches: 4, fuerza_completa_confort: true, costo_extra_persona_usd: 20, fecha_inicio: '2026-12-30', fecha_fin: '2027-01-10', activa: true },
];

const PRECIOS = [
  { posada_id: POSADA_CONFORT, temporada_id: 't-baja', modalidad: 'apartamento', num_personas: null, precio_usd: 85, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-baja', modalidad: 'completa', num_personas: null, precio_usd: 320, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-alta', modalidad: 'apartamento', num_personas: null, precio_usd: 100, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-alta', modalidad: 'completa', num_personas: null, precio_usd: 400, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-nav1', modalidad: 'completa', num_personas: null, precio_usd: 400, activo: true },
  { posada_id: POSADA_CONFORT, temporada_id: 't-nav2', modalidad: 'completa', num_personas: null, precio_usd: 450, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-baja', modalidad: 'completa', num_personas: 12, precio_usd: 180, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-baja', modalidad: 'completa', num_personas: 16, precio_usd: 200, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-baja', modalidad: 'completa', num_personas: 20, precio_usd: 250, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-alta', modalidad: 'completa', num_personas: null, precio_usd: 300, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-nav1', modalidad: 'completa', num_personas: null, precio_usd: 325, activo: true },
  { posada_id: POSADA_BEACH, temporada_id: 't-nav2', modalidad: 'completa', num_personas: null, precio_usd: 325, activo: true },
];

// ---------------------------------------------------------------------
// Tests originales (sin extras/descuento)
// ---------------------------------------------------------------------

test('enumerarNoches devuelve [) — la noche del check-out no se cuenta', () => {
  assert.deepEqual(enumerarNoches('2026-06-01', '2026-06-04'), ['2026-06-01', '2026-06-02', '2026-06-03']);
});

test('enumerarNoches con misma fecha o fecha inválida → array vacío', () => {
  assert.deepEqual(enumerarNoches('2026-06-01', '2026-06-01'), []);
  assert.deepEqual(enumerarNoches('2026-06-05', '2026-06-01'), []);
});

test('determinarTemporada: fecha en julio → Baja', () => {
  assert.equal(determinarTemporada('2026-07-15', TEMPORADAS).nombre, 'Baja');
});

test('determinarTemporada: fecha en septiembre → Alta', () => {
  assert.equal(determinarTemporada('2026-09-10', TEMPORADAS).nombre, 'Alta 2026');
});

test('determinarTemporada: fecha en Navidad → Navidad 1', () => {
  assert.equal(determinarTemporada('2026-12-25', TEMPORADAS).nombre, 'Navidad 1 (2026)');
});

test('Confort en baja, 5 noches por apto → 5 × $85 = $425', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-06',
    modalidad: 'apartamento', num_personas: 4,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.tiene_errores, false);
  assert.equal(r.total_usd, 425);
  assert.equal(r.subtotal_usd, 425);
});

test('Beach baja con 16 personas, 3 noches → 3 × $200 = $600', () => {
  const r = calcular({
    posada_slug: 'beach', posada_id: POSADA_BEACH,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-04',
    modalidad: 'completa', num_personas: 16,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.total_usd, 600);
});

test('Cruce baja → alta: 1 noche baja $85 + 4 noches alta $100 = $485', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-07-31', fecha_fin: '2026-08-05',
    modalidad: 'apartamento', num_personas: 4,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.total_usd, 485);
});

test('Confort en Navidad modalidad apartamento → error bloqueante', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-12-23', fecha_fin: '2026-12-28',
    modalidad: 'apartamento', num_personas: 4,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.tiene_errores, true);
});

// ---------------------------------------------------------------------
// Tests NUEVOS (Onda 3)
// ---------------------------------------------------------------------

test('Multi-apto: 2 aptos × 3 noches baja = 2 × 3 × $85 = $510', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-04',
    modalidad: 'apartamento', num_personas: 8,
    cantidad_apartamentos: 2,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.subtotal_usd, 510);
  assert.equal(r.total_usd, 510);
});

test('Personas extras: Beach baja 12 base + 2 extras × 3 noches × $15 = $180×3 + 2×$15×3 = $540 + $90 = $630', () => {
  const r = calcular({
    posada_slug: 'beach', posada_id: POSADA_BEACH,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-04',
    modalidad: 'completa', num_personas: 12,
    num_personas_extras: 2,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.subtotal_usd, 540);
  assert.equal(r.extras_personas_usd, 90);
  assert.equal(r.total_usd, 630);
});

test('Personas extras en alta: 1 extra × 3 noches × $20 = $60', () => {
  const r = calcular({
    posada_slug: 'beach', posada_id: POSADA_BEACH,
    fecha_inicio: '2026-08-10', fecha_fin: '2026-08-13',
    modalidad: 'completa', num_personas: 12,
    num_personas_extras: 1,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.subtotal_usd, 900); // 3 × $300
  assert.equal(r.extras_personas_usd, 60);
  assert.equal(r.total_usd, 960);
});

test('Servicio extra fijo: Confort 3 noches baja apto + $50 servicio = $255 + $50 = $305', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-04',
    modalidad: 'apartamento', num_personas: 4,
    servicio_extra_usd: 50,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.subtotal_usd, 255);
  assert.equal(r.servicio_extra_usd, 50);
  assert.equal(r.total_usd, 305);
});

test('Descuento: 5 noches Beach baja $200 = $1000 con descuento $150 → $850', () => {
  const r = calcular({
    posada_slug: 'beach', posada_id: POSADA_BEACH,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-06',
    modalidad: 'completa', num_personas: 16,
    descuento_usd: 150,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.subtotal_usd, 1000);
  assert.equal(r.descuento_usd, 150);
  assert.equal(r.total_usd, 850);
});

test('Descuento mayor que total → clamp a 0 con advertencia', () => {
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-06-01', fecha_fin: '2026-06-04',
    modalidad: 'apartamento', num_personas: 4,
    descuento_usd: 1000,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.total_usd, 0);
  assert.ok(r.advertencias.some((a) => a.includes('descuento')));
});

test('Todo junto: 2 aptos × 4 noches alta + 3 extras × $20 + $100 servicio − $50 desc', () => {
  // 2 × 4 × $100 = $800 base
  // 3 × 4 × $20 = $240 extras
  // +100 servicio = $1140
  // -50 descuento = $1090
  const r = calcular({
    posada_slug: 'confort', posada_id: POSADA_CONFORT,
    fecha_inicio: '2026-08-10', fecha_fin: '2026-08-14',
    modalidad: 'apartamento', num_personas: 14, // 2 aptos × 7 = 14 pers base, 3 extras
    cantidad_apartamentos: 2,
    num_personas_extras: 3,
    servicio_extra_usd: 100,
    descuento_usd: 50,
    temporadas: TEMPORADAS, precios: PRECIOS,
  });
  assert.equal(r.subtotal_usd, 800);
  assert.equal(r.extras_personas_usd, 240);
  assert.equal(r.servicio_extra_usd, 100);
  assert.equal(r.descuento_usd, 50);
  assert.equal(r.total_usd, 1090);
});
