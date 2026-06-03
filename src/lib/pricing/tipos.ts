// Tipos compartidos del módulo de pricing.
// Reflejan lo que vive en las tablas de Supabase pero sin amarrarse a ellas
// — para que el cálculo de precio sea puro y testeable sin DB.

export type ModalidadReserva = 'apartamento' | 'completa';

export interface TemporadaInfo {
  id: string;
  nombre: string;
  prioridad: number;
  estadia_minima_noches: number;
  fuerza_completa_confort: boolean;
  /** USD por persona extra por noche en esta temporada. Default 0 si no se provee. */
  costo_extra_persona_usd?: number;
  /** Inclusive. NULL = "Baja" / temporada por defecto. Formato YYYY-MM-DD. */
  fecha_inicio: string | null;
  /** Inclusive. NULL = "Baja" / temporada por defecto. Formato YYYY-MM-DD. */
  fecha_fin: string | null;
  activa: boolean;
}

export interface PrecioInfo {
  posada_id: string;
  temporada_id: string;
  modalidad: ModalidadReserva;
  /** NULL = precio plano que no depende del número de personas. */
  num_personas: number | null;
  precio_usd: number;
  activo: boolean;
}

export interface NocheCalculada {
  /** YYYY-MM-DD */
  fecha: string;
  temporada_id: string;
  temporada_nombre: string;
  /** Costo extra por persona en esta noche (tomado de la temporada). */
  costo_extra_persona_usd: number;
  /** Precio base (sin extras) por esta noche según modalidad y num_personas. */
  precio_usd: number;
}

export interface ResultadoPrecio {
  /** Suma de precio base de todas las noches. */
  subtotal_usd: number;
  /** Total cobrado por personas extras (num_personas_extras × extra_por_noche × noches). */
  extras_personas_usd: number;
  /** Servicio adicional fijo (limpieza extra, traslado, etc.). */
  servicio_extra_usd: number;
  /** Descuento manual (siempre positivo, se resta). */
  descuento_usd: number;
  /** Total final = subtotal + extras + servicio − descuento. */
  total_usd: number;
  /** Cuántas noches cubre la reserva. */
  cantidad_noches: number;
  /** Desglose noche por noche. */
  noches: NocheCalculada[];
  /** Temporadas únicas que tocaron este rango, ordenadas por prioridad descendente. */
  temporadas_aplicadas: { id: string; nombre: string; cantidad_noches: number }[];
  /** Estadía mínima exigida = máximo entre todas las temporadas tocadas. */
  estadia_minima_exigida: number;
  /** True si cantidad_noches >= estadia_minima_exigida. */
  cumple_estadia_minima: boolean;
  /** Mensajes que el formulario debe mostrar (warnings, errores de regla, etc.). */
  advertencias: string[];
  /** True si el cálculo no pudo completarse (precio faltante en una noche). */
  tiene_errores: boolean;
}

export interface ParametrosCalculoPrecio {
  posada_slug: 'confort' | 'beach';
  posada_id: string;
  /** YYYY-MM-DD */
  fecha_inicio: string;
  /** YYYY-MM-DD. La noche del check-out NO se cobra. */
  fecha_fin: string;
  modalidad: ModalidadReserva;
  /** Solo aplica en Beach (12/16/20 en baja) o como info de capacidad en Confort. */
  num_personas: number;
  /** Cantidad de apartamentos seleccionados cuando modalidad=apartamento.
   *  Cada apto suma su precio. Default 1 (compatibilidad). */
  cantidad_apartamentos?: number;
  /** Personas adicionales a la capacidad incluida. Se cobran a costo_extra_persona. */
  num_personas_extras?: number;
  /** Servicio extra fijo (USD). Default 0. */
  servicio_extra_usd?: number;
  /** Descuento (USD). Default 0. */
  descuento_usd?: number;
  temporadas: TemporadaInfo[];
  precios: PrecioInfo[];
}
