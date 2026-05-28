// Helpers de formato en español para fechas y precios USD.

const fmtUSD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function formatoUSD(monto: number): string {
  return fmtUSD.format(monto);
}

const fmtFecha = new Intl.DateTimeFormat('es-VE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const fmtFechaCorta = new Intl.DateTimeFormat('es-VE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * "viernes, 1 de agosto de 2026"
 */
export function formatoFechaLarga(fechaISO: string): string {
  if (!fechaISO) return '';
  return fmtFecha.format(new Date(fechaISO + 'T12:00:00Z'));
}

/**
 * "1 ago. 2026"
 */
export function formatoFechaCorta(fechaISO: string): string {
  if (!fechaISO) return '';
  return fmtFechaCorta.format(new Date(fechaISO + 'T12:00:00Z'));
}

/**
 * Devuelve YYYY-MM-DD para hoy en la zona horaria del usuario (no UTC).
 * Útil para el atributo `min` del input type=date.
 */
export function hoyISO(): string {
  const ahora = new Date();
  const tz = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return tz.toISOString().slice(0, 10);
}
