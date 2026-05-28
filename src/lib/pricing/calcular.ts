// =====================================================================
// Cálculo de precio prorrateado noche por noche
// =====================================================================
// Función PURA: recibe los datos y devuelve el resultado. No habla con
// Supabase. Eso la hace fácil de probar y permite usarla en el cliente
// para mostrar el precio en vivo mientras el usuario ajusta el formulario.
// =====================================================================

import type {
  ModalidadReserva,
  NocheCalculada,
  ParametrosCalculoPrecio,
  PrecioInfo,
  ResultadoPrecio,
  TemporadaInfo,
} from './tipos';

/**
 * Enumera todas las noches del rango [fecha_inicio, fecha_fin), exclusivo en el fin.
 * La noche del check-out NO se cobra (convención hotelera).
 *
 * Trabajamos en strings YYYY-MM-DD para evitar dolores de cabeza con zona horaria;
 * las reservas son date-only, no datetime.
 */
export function enumerarNoches(fecha_inicio: string, fecha_fin: string): string[] {
  if (fecha_fin <= fecha_inicio) return [];
  const noches: string[] = [];
  let actual = new Date(fecha_inicio + 'T12:00:00Z'); // 12pm UTC para evitar DST
  const fin = new Date(fecha_fin + 'T12:00:00Z');
  while (actual < fin) {
    noches.push(actual.toISOString().slice(0, 10));
    actual = new Date(actual.getTime() + 24 * 60 * 60 * 1000);
  }
  return noches;
}

/**
 * Para una fecha dada, retorna la temporada de mayor prioridad que la incluye.
 * Si ninguna temporada con fechas la incluye, retorna la temporada "Baja"
 * (la que tiene fecha_inicio/fecha_fin en NULL).
 */
export function determinarTemporada(
  fecha: string,
  temporadas: TemporadaInfo[],
): TemporadaInfo | null {
  const activas = temporadas.filter((t) => t.activa);

  // Candidatas: temporadas con fechas que incluyen esta fecha
  const candidatas = activas.filter(
    (t) =>
      t.fecha_inicio !== null &&
      t.fecha_fin !== null &&
      fecha >= t.fecha_inicio &&
      fecha <= t.fecha_fin,
  );

  if (candidatas.length > 0) {
    // La de mayor prioridad
    return candidatas.reduce((mejor, t) => (t.prioridad > mejor.prioridad ? t : mejor));
  }

  // Fallback: la temporada "Baja" (sin fechas)
  const baja = activas.find((t) => t.fecha_inicio === null && t.fecha_fin === null);
  return baja ?? null;
}

/**
 * Busca el precio en USD para una combinación dada. Si hay precio exacto con
 * num_personas, lo usa; si no, busca el precio "plano" con num_personas=null.
 * Devuelve null si no encuentra precio.
 */
export function buscarPrecio(
  precios: PrecioInfo[],
  posada_id: string,
  temporada_id: string,
  modalidad: ModalidadReserva,
  num_personas: number,
): number | null {
  const activos = precios.filter((p) => p.activo);

  // Match exacto con num_personas (Beach baja: 12/16/20)
  const exacto = activos.find(
    (p) =>
      p.posada_id === posada_id &&
      p.temporada_id === temporada_id &&
      p.modalidad === modalidad &&
      p.num_personas === num_personas,
  );
  if (exacto) return exacto.precio_usd;

  // Fallback: precio plano (num_personas null)
  const plano = activos.find(
    (p) =>
      p.posada_id === posada_id &&
      p.temporada_id === temporada_id &&
      p.modalidad === modalidad &&
      p.num_personas === null,
  );
  return plano ? plano.precio_usd : null;
}

/**
 * Cálculo principal: precio prorrateado noche por noche.
 *
 * Reglas implementadas:
 *   1. La noche del check-out NO se cobra.
 *   2. Cada noche se cobra con la tarifa de su temporada (mayor prioridad gana).
 *   3. Estadía mínima exigida = máxima de las temporadas que toca el rango.
 *   4. Si alguna noche cae en una temporada con fuerza_completa_confort=true
 *      y la posada es Confort y modalidad=apartamento → advertencia bloqueante.
 *   5. Si falta el precio de alguna combinación → marca tiene_errores=true.
 */
export function calcularPrecioReserva(params: ParametrosCalculoPrecio): ResultadoPrecio {
  const advertencias: string[] = [];
  let tiene_errores = false;

  const noches_fechas = enumerarNoches(params.fecha_inicio, params.fecha_fin);

  if (noches_fechas.length === 0) {
    return {
      total_usd: 0,
      cantidad_noches: 0,
      noches: [],
      temporadas_aplicadas: [],
      estadia_minima_exigida: 0,
      cumple_estadia_minima: false,
      advertencias: ['La fecha de salida debe ser posterior a la de llegada.'],
      tiene_errores: true,
    };
  }

  const noches: NocheCalculada[] = [];

  for (const fecha of noches_fechas) {
    const temp = determinarTemporada(fecha, params.temporadas);
    if (!temp) {
      tiene_errores = true;
      advertencias.push(`No se encontró temporada para la noche ${fecha}.`);
      continue;
    }

    // Regla 4: Confort en temporada especial solo permite "completa"
    if (
      params.posada_slug === 'confort' &&
      params.modalidad === 'apartamento' &&
      temp.fuerza_completa_confort
    ) {
      tiene_errores = true;
      if (!advertencias.some((a) => a.includes(temp.nombre))) {
        advertencias.push(
          `En "${temp.nombre}" la posada Confort solo se alquila completa, no por apartamento individual.`,
        );
      }
    }

    const precio = buscarPrecio(
      params.precios,
      params.posada_id,
      temp.id,
      params.modalidad,
      params.num_personas,
    );

    if (precio === null) {
      tiene_errores = true;
      advertencias.push(
        `No hay tarifa configurada para "${temp.nombre}" en modalidad ${params.modalidad}` +
          (params.posada_slug === 'beach' ? ` con ${params.num_personas} personas` : '') +
          `. Contáctanos para cotizar.`,
      );
      continue;
    }

    noches.push({
      fecha,
      temporada_id: temp.id,
      temporada_nombre: temp.nombre,
      precio_usd: precio,
    });
  }

  // Agrupar por temporada para el resumen
  const conteoTemps = new Map<string, { id: string; nombre: string; cantidad_noches: number }>();
  for (const n of noches) {
    const prev = conteoTemps.get(n.temporada_id);
    if (prev) prev.cantidad_noches++;
    else
      conteoTemps.set(n.temporada_id, {
        id: n.temporada_id,
        nombre: n.temporada_nombre,
        cantidad_noches: 1,
      });
  }
  const temporadas_aplicadas = Array.from(conteoTemps.values()).sort((a, b) => {
    const tA = params.temporadas.find((t) => t.id === a.id)?.prioridad ?? 0;
    const tB = params.temporadas.find((t) => t.id === b.id)?.prioridad ?? 0;
    return tB - tA;
  });

  // Estadía mínima: la mayor de todas las temporadas tocadas
  const estadia_minima_exigida = temporadas_aplicadas.reduce((max, t) => {
    const tempData = params.temporadas.find((x) => x.id === t.id);
    return tempData ? Math.max(max, tempData.estadia_minima_noches) : max;
  }, 1);

  const cantidad_noches = noches_fechas.length;
  const cumple_estadia_minima = cantidad_noches >= estadia_minima_exigida;

  if (!cumple_estadia_minima) {
    advertencias.push(
      `La estadía mínima para estas fechas es de ${estadia_minima_exigida} noches; estás pidiendo ${cantidad_noches}.`,
    );
  }

  const total_usd = noches.reduce((sum, n) => sum + n.precio_usd, 0);

  return {
    total_usd,
    cantidad_noches,
    noches,
    temporadas_aplicadas,
    estadia_minima_exigida,
    cumple_estadia_minima,
    advertencias,
    tiene_errores,
  };
}
