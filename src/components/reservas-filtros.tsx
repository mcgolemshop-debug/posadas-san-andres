'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const ESTADOS = [
  { v: '',           l: 'Todas' },
  { v: 'pendiente',  l: 'Pendientes' },
  { v: 'confirmada', l: 'Confirmadas' },
  { v: 'rechazada',  l: 'Rechazadas' },
  { v: 'cancelada',  l: 'Canceladas' },
];

const POSADAS = [
  { v: '',        l: 'Ambas' },
  { v: 'confort', l: 'Confort' },
  { v: 'beach',   l: 'Beach' },
];

export function ReservasFiltros() {
  const router = useRouter();
  const params = useSearchParams();

  const set = useCallback(
    (clave: string, valor: string) => {
      const nuevos = new URLSearchParams(params.toString());
      if (valor) nuevos.set(clave, valor);
      else nuevos.delete(clave);
      router.push(`/admin/reservas?${nuevos.toString()}`);
    },
    [params, router],
  );

  return (
    <div className="flex flex-wrap gap-3 items-end mb-6 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
      <label className="flex flex-col text-sm">
        <span className="text-[var(--muted)] mb-1">Estado</span>
        <select
          value={params.get('estado') ?? ''}
          onChange={(e) => set('estado', e.target.value)}
          className="px-3 py-1.5 border border-[var(--border)] rounded-md bg-white"
        >
          {ESTADOS.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-sm">
        <span className="text-[var(--muted)] mb-1">Posada</span>
        <select
          value={params.get('posada') ?? ''}
          onChange={(e) => set('posada', e.target.value)}
          className="px-3 py-1.5 border border-[var(--border)] rounded-md bg-white"
        >
          {POSADAS.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-sm">
        <span className="text-[var(--muted)] mb-1">Desde</span>
        <input
          type="date"
          value={params.get('desde') ?? ''}
          onChange={(e) => set('desde', e.target.value)}
          className="px-3 py-1.5 border border-[var(--border)] rounded-md bg-white"
        />
      </label>

      <label className="flex flex-col text-sm">
        <span className="text-[var(--muted)] mb-1">Hasta</span>
        <input
          type="date"
          value={params.get('hasta') ?? ''}
          onChange={(e) => set('hasta', e.target.value)}
          className="px-3 py-1.5 border border-[var(--border)] rounded-md bg-white"
        />
      </label>

      {(params.get('estado') || params.get('posada') || params.get('desde') || params.get('hasta')) && (
        <button
          type="button"
          onClick={() => router.push('/admin/reservas')}
          className="px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
