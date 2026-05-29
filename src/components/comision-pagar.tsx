'use client';

import { useActionState, useState } from 'react';
import {
  marcarComisionPagada,
  revertirComisionPagada,
  type EstadoComision,
} from '@/app/admin/(panel)/comisiones/actions';
import { hoyISO } from '@/lib/formato';

export function ComisionPagar({ comisionId, estado }: { comisionId: string; estado: string }) {
  const [estadoUI, accion, pendiente] = useActionState<EstadoComision | null, FormData>(
    estado === 'pagada' ? revertirComisionPagada : marcarComisionPagada,
    null,
  );
  const [mostrandoFecha, setMostrandoFecha] = useState(false);

  if (estado === 'pagada') {
    return (
      <form action={accion} className="inline-block">
        <input type="hidden" name="comision_id" value={comisionId} />
        <button
          type="submit"
          disabled={pendiente}
          className="text-xs px-2 py-1 border border-[var(--border)] rounded text-[var(--muted)] hover:bg-[var(--background)]"
          title={estadoUI?.error}
        >
          ↺ Revertir
        </button>
      </form>
    );
  }

  if (!mostrandoFecha) {
    return (
      <button
        type="button"
        onClick={() => setMostrandoFecha(true)}
        className="text-xs px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-100"
      >
        Marcar pagada
      </button>
    );
  }

  return (
    <form action={accion} className="inline-flex items-center gap-1">
      <input type="hidden" name="comision_id" value={comisionId} />
      <input
        type="date"
        name="fecha_pago"
        required
        defaultValue={hoyISO()}
        max={hoyISO()}
        className="text-xs px-1.5 py-1 border border-[var(--border)] rounded"
      />
      <button type="submit" disabled={pendiente} className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700">
        ✓
      </button>
      <button type="button" onClick={() => setMostrandoFecha(false)} className="text-xs px-1.5 py-1 text-[var(--muted)] hover:text-[var(--foreground)]">
        ×
      </button>
      {estadoUI?.error && <span className="text-xs text-red-700 ml-1">{estadoUI.error}</span>}
    </form>
  );
}
