'use client';

import { useActionState, useState } from 'react';
import { crearGasto, type EstadoGasto } from '@/app/admin/(panel)/gastos/actions';
import { hoyISO } from '@/lib/formato';

interface PosadaOpcion {
  id: string;
  nombre: string;
}

const CATEGORIAS = [
  { v: 'electrico', l: 'Eléctrico (cables, tomacorrientes…)' },
  { v: 'aires', l: 'Aires acondicionados' },
  { v: 'iluminacion', l: 'Iluminación (bombillos)' },
  { v: 'pintura', l: 'Pintura' },
  { v: 'seguridad', l: 'Seguridad (cerco eléctrico, cámaras)' },
  { v: 'reparaciones', l: 'Reparaciones generales' },
  { v: 'otros', l: 'Otros' },
];

interface Props {
  posadas: PosadaOpcion[];
  /** Si está asignado a una posada (conserje), prellena y oculta el selector. */
  posadaForzadaId?: string;
}

export function GastoFormCrear({ posadas, posadaForzadaId }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoGasto | null, FormData>(
    crearGasto,
    null,
  );
  const [abierto, setAbierto] = useState(false);

  if (estado?.ok && abierto) setAbierto(false);

  return (
    <div className="mb-6">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="bg-[var(--primary)] hover:bg-[var(--primary-soft)] text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Registrar gasto
        </button>
      ) : (
        <form action={accion} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Nuevo gasto</h3>
            <button type="button" onClick={() => setAbierto(false)} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {posadaForzadaId ? (
              <input type="hidden" name="posada_id" value={posadaForzadaId} />
            ) : (
              <label className="text-sm">
                <span className="text-[var(--muted)]">Posada</span>
                <select name="posada_id" required className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white">
                  <option value="">— elegir —</option>
                  {posadas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </label>
            )}

            <label className="text-sm">
              <span className="text-[var(--muted)]">Categoría</span>
              <select name="categoria" required className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white">
                {CATEGORIAS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </label>

            <label className="text-sm sm:col-span-2">
              <span className="text-[var(--muted)]">Descripción</span>
              <input type="text" name="descripcion" required maxLength={500} placeholder="Ej: 2 bombillos LED para Atardecer" className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>

            <label className="text-sm">
              <span className="text-[var(--muted)]">Monto (USD)</span>
              <input type="number" name="monto_usd" required step="0.01" min={0.01} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>

            <label className="text-sm">
              <span className="text-[var(--muted)]">Fecha</span>
              <input type="date" name="fecha" required defaultValue={hoyISO()} max={hoyISO()} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>

            <label className="text-sm sm:col-span-2">
              <span className="text-[var(--muted)]">Recibo (opcional, JPG/PNG/PDF)</span>
              <input type="file" name="recibo" accept="image/*,.pdf" className="mt-1 w-full text-sm" />
            </label>
          </div>

          {estado?.error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              ⚠ {estado.error}
            </div>
          )}

          <button type="submit" disabled={pendiente} className="mt-4 bg-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium">
            {pendiente ? 'Guardando…' : 'Registrar gasto'}
          </button>
        </form>
      )}

      {estado?.ok && !abierto && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-900">
          ✓ {estado.ok}
        </div>
      )}
    </div>
  );
}
