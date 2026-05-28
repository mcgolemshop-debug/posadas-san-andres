// =====================================================================
// Validación de disponibilidad contra reservas confirmadas
// =====================================================================
// Esta función SÍ habla con Supabase (a diferencia del cálculo de precio).
// Por eso recibe un client Supabase como parámetro.
//
// Reglas:
//   - Una reserva CONFIRMADA bloquea sus fechas.
//   - Las pendientes NO bloquean (pueden coexistir varias pendientes;
//     el dueño decide cuál confirmar).
//   - En Confort, "completa" choca con cualquier apartamento individual,
//     y viceversa.
//   - El check del lado del cliente es informativo; la validez REAL la
//     impone el trigger reserva_no_solape en la base de datos al momento
//     de confirmar.
// =====================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ModalidadReserva } from './tipos';

export interface ParametrosDisponibilidad {
  posada_id: string;
  apartamento_id: string | null;
  modalidad: ModalidadReserva;
  /** YYYY-MM-DD */
  fecha_inicio: string;
  /** YYYY-MM-DD (check-out, exclusivo) */
  fecha_fin: string;
}

export interface ResultadoDisponibilidad {
  disponible: boolean;
  conflictos: Array<{
    fecha_inicio: string;
    fecha_fin: string;
    apartamento_nombre: string | null;
    modalidad: ModalidadReserva;
  }>;
  mensaje: string | null;
}

export async function validarDisponibilidad(
  supabase: SupabaseClient,
  params: ParametrosDisponibilidad,
): Promise<ResultadoDisponibilidad> {
  // Buscamos reservas confirmadas en la misma posada cuyas fechas
  // solapen con [fecha_inicio, fecha_fin).
  const { data: candidatas, error } = await supabase
    .from('reservas')
    .select('id, fecha_inicio, fecha_fin, modalidad, apartamento_id, apartamentos(nombre)')
    .eq('posada_id', params.posada_id)
    .eq('estado', 'confirmada')
    // Solapamiento: existente.fecha_inicio < nueva.fecha_fin AND existente.fecha_fin > nueva.fecha_inicio
    .lt('fecha_inicio', params.fecha_fin)
    .gt('fecha_fin', params.fecha_inicio);

  if (error) {
    throw new Error(`Error consultando disponibilidad: ${error.message}`);
  }

  const conflictosBrutos = candidatas ?? [];

  // Filtrar según modalidad
  let conflictos = conflictosBrutos;
  if (params.modalidad === 'apartamento') {
    // Choca con: mismo apartamento, o cualquier "completa" de la posada
    conflictos = conflictosBrutos.filter(
      (c) => c.apartamento_id === params.apartamento_id || c.modalidad === 'completa',
    );
  }
  // Si modalidad === 'completa', choca con CUALQUIERA → no filtramos

  if (conflictos.length === 0) {
    return { disponible: true, conflictos: [], mensaje: null };
  }

  const conflictosFormateados = conflictos.map((c) => {
    // En la query, "apartamentos" viene como objeto (si hay relación) o null.
    // Supabase a veces lo tipa como array; sacamos el nombre con cuidado.
    const apto = c.apartamentos as unknown as { nombre: string } | { nombre: string }[] | null;
    const aptoNombre = Array.isArray(apto) ? (apto[0]?.nombre ?? null) : (apto?.nombre ?? null);
    return {
      fecha_inicio: c.fecha_inicio as string,
      fecha_fin: c.fecha_fin as string,
      apartamento_nombre: aptoNombre,
      modalidad: c.modalidad as ModalidadReserva,
    };
  });

  const mensaje =
    conflictos.length === 1
      ? `Esas fechas chocan con una reserva confirmada del ${conflictosFormateados[0].fecha_inicio} al ${conflictosFormateados[0].fecha_fin}.`
      : `Esas fechas chocan con ${conflictos.length} reservas confirmadas.`;

  return {
    disponible: false,
    conflictos: conflictosFormateados,
    mensaje,
  };
}
