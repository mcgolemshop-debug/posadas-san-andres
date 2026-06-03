'use client';

import { useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

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

  const fechasOcupadas = useMemo(
    () => calcularFechasOcupadas(reservas, contexto, posadaSlug),
    [reservas, contexto, posadaSlug],
  );

  const proximas = useMemo(() => {
    // NO filtramos por "fecha < hoy" porque el servidor ya nos pasa
    // solo reservas a futuro (filtrado por gte('fecha_fin', hoyISO) en SSR).
    // Si filtráramos en el cliente, el resultado dependería de la fecha
    // del navegador del usuario — y si su reloj está mal o hay un desfase
    // de timezone, podría excluir reservas que SÍ son futuras.
    return reservas
      .filter((r) => {
        if (posadaSlug === 'beach') return true;
        if (contexto.modalidad === 'completa') return true;
        if (r.modalidad === 'completa') return true;
        const susAptos: string[] = Array.isArray(r.apartamentos_ids) && r.apartamentos_ids.length > 0
          ? r.apartamentos_ids
          : (r.apartamento_id ? [r.apartamento_id] : []);
        return susAptos.includes(contexto.apartamentoId!);
      })
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
      .slice(0, 8);
  }, [reservas, contexto, posadaSlug]);

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
          modifiers={{ ocupado: fechasOcupadas }}
          modifiersClassNames={{ ocupado: 'rdp-ocupado' }}
          disabled={fechasOcupadas.map((d) => ({ from: d, to: d }))}
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
          <span className="w-4 h-4 rounded bg-white border border-[var(--border)]" />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border-2 border-[var(--accent)] bg-white" />
          Hoy
        </span>
      </div>

      {/* Próximas fechas ocupadas */}
      {proximas.length > 0 ? (
        <div className="mt-6 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-[var(--foreground-muted)] mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Próximas fechas ocupadas
          </p>
          <ul className="space-y-1 text-sm">
            {proximas.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-[var(--foreground)]">
                <XCircle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                <span className="font-mono text-xs">{r.fecha_inicio}</span>
                <span className="text-[var(--foreground-subtle)]">→</span>
                <span className="font-mono text-xs">{r.fecha_fin}</span>
                {posadaSlug === 'confort' && (
                  <span className="text-xs text-[var(--foreground-muted)] ml-1">
                    ({r.modalidad === 'completa' ? 'completa' : 'apto'})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5" />
          ¡Buenas noticias! Sin fechas ocupadas próximas para esta opción.
        </div>
      )}
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

/**
 * Devuelve la lista de Date objects (una por cada noche [inicio, fin))
 * que están ocupadas para el contexto dado.
 *
 * Reglas:
 *   - Beach: TODAS las reservas confirmadas bloquean.
 *   - Confort completa: TODAS las reservas en Confort bloquean.
 *   - Confort apartamento X: reservas del mismo apto + cualquier completa.
 */
function calcularFechasOcupadas(
  reservas: ReservaCalendar[],
  contexto: { modalidad: 'completa'; apartamentoId: null } | { modalidad: 'apartamento'; apartamentoId: string },
  posadaSlug: 'confort' | 'beach',
): Date[] {
  const fechas: Date[] = [];
  for (const r of reservas) {
    if (debeBloquear(r, contexto, posadaSlug)) {
      acumularNoches(fechas, r.fecha_inicio, r.fecha_fin);
    }
  }
  return fechas;
}

function debeBloquear(
  r: ReservaCalendar,
  ctx: { modalidad: 'completa'; apartamentoId: null } | { modalidad: 'apartamento'; apartamentoId: string },
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

function acumularNoches(out: Date[], inicio: string, fin: string): void {
  let actual = new Date(inicio + 'T12:00:00Z');
  const end = new Date(fin + 'T12:00:00Z');
  while (actual < end) {
    out.push(new Date(actual));
    actual = new Date(actual.getTime() + 24 * 60 * 60 * 1000);
  }
}

/**
 * Helper exportado: dado un rango de fechas elegido por el usuario y la
 * lista de fechas ocupadas, devuelve TRUE si el rango choca con alguna.
 * Útil para el formulario de reserva.
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
 * Helper exportado: para usar como prop `disabled` de DayPicker,
 * devuelve la lista de Date objects que el usuario no puede seleccionar.
 */
export function fechasOcupadasParaContexto(
  reservas: ReservaCalendar[],
  contexto: { modalidad: 'completa'; apartamentoId: null } | { modalidad: 'apartamento'; apartamentoId: string },
  posadaSlug: 'confort' | 'beach',
): Date[] {
  return calcularFechasOcupadas(reservas, contexto, posadaSlug);
}
