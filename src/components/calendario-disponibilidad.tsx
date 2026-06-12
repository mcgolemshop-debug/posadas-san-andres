'use client';

import { useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { XCircle } from 'lucide-react';

export interface ReservaCalendar {
  fecha_inicio: string;  // YYYY-MM-DD
  fecha_fin: string;     // YYYY-MM-DD (check-out, exclusivo)
  modalidad: 'apartamento' | 'completa';
  apartamento_id: string | null;
  /** Multi-apto: array de IDs de apartamentos cuando modalidad=apartamento. Si presente, suplanta apartamento_id. */
  apartamentos_ids?: string[] | null;
}

interface ApartamentoOpcion {
  id: string;
  nombre: string;
}

interface Props {
  reservas: ReservaCalendar[];
  /** Solo para Confort: lista de apartamentos para el filtro. */
  apartamentos?: ApartamentoOpcion[];
  posadaSlug: 'confort' | 'beach';
  /** Cantidad de meses visibles (default 2). */
  meses?: number;
}

/**
 * Vista informativa: muestra un calendario con las fechas ocupadas
 * tachadas en rojo. NO permite seleccionar — es solo para que el
 * cliente vea disponibilidad antes de ir al formulario.
 */
export function CalendarioDisponibilidad({
  reservas,
  apartamentos,
  posadaSlug,
  meses = 2,
}: Props) {
  // Filtro: en Beach no hay filtro (todo es completa). En Confort, el cliente
  // puede ver disponibilidad de "toda la posada" o de un apto específico.
  const [contexto, setContexto] = useState<
    { modalidad: 'completa'; apartamentoId: null } | { modalidad: 'apartamento'; apartamentoId: string }
  >({ modalidad: 'completa', apartamentoId: null });

  const { nochesPlenas, checkIns, checkOuts } = useMemo(
    () => calcularSplit(reservas, contexto, posadaSlug),
    [reservas, contexto, posadaSlug],
  );

  return (
    <div>
      {/* Filtro Confort */}
      {posadaSlug === 'confort' && apartamentos && apartamentos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <FiltroChip
            activo={contexto.modalidad === 'completa'}
            onClick={() => setContexto({ modalidad: 'completa', apartamentoId: null })}
          >
            Toda la posada
          </FiltroChip>
          {apartamentos.map((a) => (
            <FiltroChip
              key={a.id}
              activo={contexto.modalidad === 'apartamento' && contexto.apartamentoId === a.id}
              onClick={() => setContexto({ modalidad: 'apartamento', apartamentoId: a.id })}
            >
              {a.nombre}
            </FiltroChip>
          ))}
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 inline-block w-full overflow-x-auto">
        <DayPicker
          mode="single"
          selected={undefined}
          onSelect={() => {}}
          modifiers={{ ocupado: nochesPlenas, checkin: checkIns, checkout: checkOuts }}
          modifiersClassNames={{
            ocupado: 'rdp-ocupado',
            checkin: 'rdp-checkin',
            checkout: 'rdp-checkout',
          }}
          numberOfMonths={meses}
          startMonth={new Date()}
          locale={es}
          showOutsideDays={false}
        />
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-[var(--foreground-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-[var(--danger-light)] border border-[var(--danger)]/30 flex items-center justify-center">
            <XCircle className="w-3 h-3 text-[var(--danger)]" />
          </span>
          Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded border border-[#f87171]"
            style={{ background: 'linear-gradient(135deg, #fecaca 0% 49%, transparent 51% 100%)' }}
          />
          Día de salida (12:00 m)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded border border-[#f87171]"
            style={{ background: 'linear-gradient(135deg, transparent 0% 49%, #fecaca 51% 100%)' }}
          />
          Día de llegada (2:00 PM)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-white border border-[var(--border)]" />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border-2 border-[var(--accent)] bg-white" />
          Hoy
        </span>
      </div>

    </div>
  );
}

function FiltroChip({
  activo, onClick, children,
}: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        activo
          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
          : 'bg-white text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
      }`}
    >
      {children}
    </button>
  );
}

/* --------------- helpers --------------- */

export type ContextoOcupacion =
  | { modalidad: 'completa'; apartamentoId: null }
  | { modalidad: 'apartamento'; apartamentoId: string };

export interface DesgloseOcupacion {
  /** Noches "plenas" entre el primer día y el último (estrictamente, F+1 a L-1). */
  nochesPlenas: Date[];
  /** Día fecha_inicio de cada reserva relevante. La tarde está ocupada, la mañana libre. */
  checkIns: Date[];
  /** Día fecha_fin de cada reserva relevante. La mañana está ocupada, la tarde libre. */
  checkOuts: Date[];
}

/**
 * Devuelve un desglose con 3 listas:
 *   - nochesPlenas: el cliente NO puede usar este día de ninguna forma.
 *   - checkIns: el cliente PUEDE usarlo como SU check-out (sale a 12 m), no como check-in.
 *   - checkOuts: el cliente PUEDE usarlo como SU check-in (entra a 2 PM), no como check-out.
 *
 * Reglas de filtrado:
 *   - Beach: TODAS las reservas confirmadas bloquean.
 *   - Confort completa: TODAS las reservas en Confort bloquean.
 *   - Confort apartamento X: reservas del mismo apto + cualquier completa.
 */
export function calcularSplit(
  reservas: ReservaCalendar[],
  contexto: ContextoOcupacion,
  posadaSlug: 'confort' | 'beach',
): DesgloseOcupacion {
  const nochesPlenas: Date[] = [];
  const checkIns: Date[] = [];
  const checkOuts: Date[] = [];
  for (const r of reservas) {
    if (!debeBloquear(r, contexto, posadaSlug)) continue;
    const inicio = new Date(r.fecha_inicio + 'T12:00:00Z');
    const fin = new Date(r.fecha_fin + 'T12:00:00Z');
    checkIns.push(new Date(inicio));
    checkOuts.push(new Date(fin));
    // Días intermedios (estrictamente entre F+1 y L-1)
    let cursor = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
    while (cursor < fin) {
      nochesPlenas.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
  }
  return { nochesPlenas, checkIns, checkOuts };
}

function debeBloquear(
  r: ReservaCalendar,
  ctx: ContextoOcupacion,
  posadaSlug: 'confort' | 'beach',
): boolean {
  if (posadaSlug === 'beach') return true;
  if (ctx.modalidad === 'completa') return true;
  if (r.modalidad === 'completa') return true;
  // Reserva existente puede ser multi-apto (apartamentos_ids[]) o single (apartamento_id).
  const susAptos: string[] = Array.isArray(r.apartamentos_ids) && r.apartamentos_ids.length > 0
    ? r.apartamentos_ids
    : (r.apartamento_id ? [r.apartamento_id] : []);
  return susAptos.includes(ctx.apartamentoId);
}

/**
 * Helper: dado un rango de fechas [fechaInicio, fechaFin) elegido por el cliente,
 * y la lista de "noches ocupadas" (que incluye check-ins + nochesPlenas, NO check-outs),
 * devuelve TRUE si hay choque. fechaFin es exclusiva: si el cliente sale el día F (fecha_inicio
 * existente), eso NO choca porque sale a 12 m antes del check-in a 2 PM.
 */
export function rangoChocaConOcupadas(
  fechaInicio: string,
  fechaFin: string,
  ocupadas: Date[],
): boolean {
  const inicio = new Date(fechaInicio + 'T12:00:00Z');
  const fin = new Date(fechaFin + 'T12:00:00Z');
  return ocupadas.some((d) => d >= inicio && d < fin);
}

/**
 * Helper exportado para `reserva-form.tsx`: combina check-ins + nochesPlenas
 * en una sola lista de fechas que representan "noches ocupadas" — fechas en las
 * que el cliente NO puede iniciar reserva ni hacer pasar su rango.
 */
export function fechasOcupadasParaContexto(
  reservas: ReservaCalendar[],
  contexto: ContextoOcupacion,
  posadaSlug: 'confort' | 'beach',
): Date[] {
  const { nochesPlenas, checkIns } = calcularSplit(reservas, contexto, posadaSlug);
  return [...checkIns, ...nochesPlenas];
}

/** Días de check-OUT (fecha_fin) de cada reserva relevante. NO ocupan noche. */
export function fechasCheckOutParaContexto(
  reservas: ReservaCalendar[],
  contexto: ContextoOcupacion,
  posadaSlug: 'confort' | 'beach',
): Date[] {
  return calcularSplit(reservas, contexto, posadaSlug).checkOuts;
}

/** Días de check-IN (fecha_inicio) de cada reserva relevante. Sí ocupan noche. */
export function fechasCheckInParaContexto(
  reservas: ReservaCalendar[],
  contexto: ContextoOcupacion,
  posadaSlug: 'confort' | 'beach',
): Date[] {
  return calcularSplit(reservas, contexto, posadaSlug).checkIns;
}

/** Solo las noches "plenas" (entre F+1 y L-1, sin check-in ni check-out). */
export function nochesPlenasParaContexto(
  reservas: ReservaCalendar[],
  contexto: ContextoOcupacion,
  posadaSlug: 'confort' | 'beach',
): Date[] {
  return calcularSplit(reservas, contexto, posadaSlug).nochesPlenas;
}
