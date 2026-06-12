'use client';

import { useActionState, useMemo, useState } from 'react';
import { registrarPago, type EstadoPago } from '@/app/admin/(panel)/pagos/actions';
import { formatoUSD, hoyISO } from '@/lib/formato';

interface ReservaOpcion {
  id: string;
  cliente_nombre: string;
  total_usd: number;
  posada_nombre: string;
  fecha_inicio: string;
}

const CANALES = [
  { v: 'zelle', l: 'Zelle' },
  { v: 'binance', l: 'Binance' },
  { v: 'banco_panama', l: 'Banco Panamá' },
  { v: 'banco_venezuela', l: 'Banco Venezuela' },
  { v: 'efectivo', l: 'Efectivo' },
];

export function PagoFormCrear({ reservas }: { reservas: ReservaOpcion[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoPago | null, FormData>(registrarPago, null);
  const [abierto, setAbierto] = useState(false);
  const [bruto, setBruto] = useState(0);
  const [comision, setComision] = useState(0);

  const neto = useMemo(() => Math.max(0, bruto - comision), [bruto, comision]);

  if (estado?.ok && abierto) {
    setAbierto(false);
    setBruto(0);
    setComision(0);
  }

  return (
    <div className="mb-6">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Registrar pago
        </button>
      ) : (
        <form action={accion} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Registrar nuevo pago</h3>
            <button type="button" onClick={() => setAbierto(false)} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm sm:col-span-2">
              <span className="text-[var(--muted)]">Reserva</span>
              <select name="reserva_id" required className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white">
                <option value="">— elegir reserva —</option>
                {reservas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.cliente_nombre} · {r.posada_nombre} · {r.fecha_inicio} · {formatoUSD(r.total_usd)}
                  </option>
                ))}
              </select>
              {reservas.length === 0 && (
                <p className="text-xs text-[var(--muted)] mt-1">No hay reservas confirmadas en la BD.</p>
              )}
            </label>

            <label className="text-sm">
              <span className="text-[var(--muted)]">Canal</span>
              <select name="canal" required className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white">
                {CANALES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </label>

            <label className="text-sm">
              <span className="text-[var(--muted)]">Fecha del pago</span>
              <input type="date" name="fecha_pago" required defaultValue={hoyISO()} max={hoyISO()} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>

            <label className="text-sm">
              <span className="text-[var(--muted)]">Monto bruto (USD)</span>
              <input type="number" name="monto_bruto_usd" required step="0.01" min={0.01} value={bruto || ''} onChange={(e) => setBruto(Number(e.target.value))} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>

            <label className="text-sm">
              <span className="text-[var(--muted)]">Comisión retenida (opcional)</span>
              <input type="number" name="comision_retenida_usd" step="0.01" min={0} value={comision || ''} onChange={(e) => setComision(Number(e.target.value))} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
              <span className="text-xs text-[var(--muted)]">Si Vulcanos cobró y descontó su 10% antes de depositarte.</span>
            </label>

            <label className="text-sm sm:col-span-2">
              <span className="text-[var(--muted)]">Notas (opcional)</span>
              <input type="text" name="notas" maxLength={500} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>
          </div>

          {bruto > 0 && (
            <div className="mt-4 p-3 bg-[var(--background)] rounded text-sm flex justify-between">
              <span className="text-[var(--muted)]">Neto al Dueño:</span>
              <strong className="text-[var(--primary)]">{formatoUSD(neto)}</strong>
            </div>
          )}

          {estado?.error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              ⚠ {estado.error}
            </div>
          )}

          <button type="submit" disabled={pendiente} className="mt-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium">
            {pendiente ? 'Guardando…' : 'Registrar pago'}
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
