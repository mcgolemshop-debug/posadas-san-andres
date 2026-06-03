'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertCircle } from 'lucide-react';
import { eliminarReserva, type EstadoAccion } from '@/app/admin/(panel)/reservas/[id]/actions';

export function EliminarReservaBtn({ reservaId }: { reservaId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoAccion | null, FormData>(
    eliminarReserva,
    null,
  );

  if (estado?.ok) {
    // Tras eliminar, redirigir al listado
    setTimeout(() => router.push('/admin/reservas'), 200);
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 rounded-md text-sm hover:bg-red-50 text-red-700"
        title="Eliminar (soft-delete: se puede restaurar)"
      >
        <Trash2 className="w-3.5 h-3.5" /> Eliminar
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md text-sm">
      <AlertCircle className="w-3.5 h-3.5 text-red-700" />
      <span className="text-red-800 text-xs">¿Seguro?</span>
      <form action={accion} className="inline">
        <input type="hidden" name="reserva_id" value={reservaId} />
        <button
          type="submit"
          disabled={pendiente}
          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
        >
          {pendiente ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="px-2 py-0.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
      >
        Cancelar
      </button>
      {estado?.error && <span className="text-xs text-red-700">{estado.error}</span>}
    </div>
  );
}
