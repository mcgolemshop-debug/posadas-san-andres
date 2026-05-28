'use client';

import { useActionState, useState } from 'react';
import {
  confirmarReserva,
  rechazarReserva,
  tomarReservaVulcanos,
  type EstadoAccion,
} from '@/app/admin/(panel)/reservas/[id]/actions';

type Props = {
  reservaId: string;
  rol: 'dueno' | 'conserje' | 'vulcanos' | 'contador';
  /** True si la reserva es pendiente y el usuario actual puede confirmarla/rechazarla */
  puedeAccionar: boolean;
  /** True si Vulcanos puede "tomar" esta reserva (pendiente sin gestor) */
  puedeTomar: boolean;
};

export function AccionesReserva({ reservaId, puedeAccionar, puedeTomar }: Props) {
  const [estadoConf, accionConfirmar, pendienteConf] = useActionState<EstadoAccion | null, FormData>(
    confirmarReserva,
    null,
  );
  const [estadoRech, accionRechazar, pendienteRech] = useActionState<EstadoAccion | null, FormData>(
    rechazarReserva,
    null,
  );
  const [estadoTomar, accionTomar, pendienteTomar] = useActionState<EstadoAccion | null, FormData>(
    tomarReservaVulcanos,
    null,
  );

  const [mostrandoRechazo, setMostrandoRechazo] = useState(false);

  const estadoUI = estadoConf ?? estadoRech ?? estadoTomar;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <p className="font-semibold mb-3">Acciones</p>

      {estadoUI?.ok && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-900">
          ✓ {estadoUI.ok}
        </div>
      )}
      {estadoUI?.error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          ⚠ {estadoUI.error}
        </div>
      )}

      {/* Tomar (Vulcanos) */}
      {puedeTomar && (
        <form action={accionTomar} className="mb-3">
          <input type="hidden" name="reserva_id" value={reservaId} />
          <button
            type="submit"
            disabled={pendienteTomar}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-medium py-2 rounded-md text-sm"
          >
            {pendienteTomar ? 'Asignando…' : '🙋 Asignarme como gestor'}
          </button>
          <p className="text-xs text-[var(--muted)] mt-1.5">
            Esto te marca como el gestor que trajo la reserva (para la comisión).
          </p>
        </form>
      )}

      {/* Confirmar */}
      {puedeAccionar && !mostrandoRechazo && (
        <>
          <form action={accionConfirmar} className="mb-3">
            <input type="hidden" name="reserva_id" value={reservaId} />
            <button
              type="submit"
              disabled={pendienteConf}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-md"
            >
              {pendienteConf ? 'Confirmando…' : '✓ Confirmar reserva'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMostrandoRechazo(true)}
            className="w-full bg-white hover:bg-red-50 border border-red-200 text-red-700 font-medium py-2 rounded-md text-sm"
          >
            ✗ Rechazar
          </button>
        </>
      )}

      {/* Rechazar con motivo */}
      {puedeAccionar && mostrandoRechazo && (
        <form action={accionRechazar}>
          <input type="hidden" name="reserva_id" value={reservaId} />
          <label className="block mb-2 text-sm">
            <span className="text-[var(--muted)]">Motivo del rechazo</span>
            <textarea
              name="motivo"
              required
              rows={3}
              placeholder="Comprobante no coincide, fechas no disponibles, etc."
              className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMostrandoRechazo(false)}
              className="flex-1 bg-white hover:bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] py-2 rounded-md text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendienteRech}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-md text-sm"
            >
              {pendienteRech ? 'Rechazando…' : 'Confirmar rechazo'}
            </button>
          </div>
        </form>
      )}

      {!puedeAccionar && !puedeTomar && (
        <p className="text-sm text-[var(--muted)] italic">
          Sin acciones disponibles para tu rol o el estado actual de la reserva.
        </p>
      )}
    </div>
  );
}
