'use client';

import { useActionState, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { eliminarPago, type EstadoPago } from '@/app/admin/(panel)/pagos/actions';

export function EliminarPagoBtn({ pagoId }: { pagoId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoPago | null, FormData>(eliminarPago, null);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-xs px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50 inline-flex items-center gap-1"
        title="Eliminar pago"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    );
  }

  return (
    <form action={accion} className="inline-flex items-center gap-1">
      <input type="hidden" name="pago_id" value={pagoId} />
      <button type="submit" disabled={pendiente} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded">
        {pendiente ? '…' : 'Sí'}
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="text-xs px-1 text-[var(--foreground-muted)]">×</button>
      {estado?.error && <span className="text-xs text-red-700">{estado.error}</span>}
    </form>
  );
}
