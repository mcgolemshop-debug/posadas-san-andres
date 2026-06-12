'use client';

import { useActionState, useState } from 'react';
import {
  generarNominaDelMes,
  crearBono,
  marcarNominaPagada,
  revertirNominaPagada,
  actualizarSueldoConserje,
  type EstadoNomina,
} from '@/app/admin/(panel)/nomina/actions';
import { hoyISO } from '@/lib/formato';

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------
// Botón para generar la nómina del mes
// ---------------------------------------------------------------------
export function GenerarNominaMes() {
  const [estado, accion, pendiente] = useActionState<EstadoNomina | null, FormData>(generarNominaDelMes, null);
  return (
    <form action={accion} className="flex items-end gap-2">
      <label className="text-sm">
        <span className="text-[var(--muted)]">Mes</span>
        <input type="month" name="mes" required defaultValue={mesActual()} className="mt-1 block px-3 py-1.5 border border-[var(--border)] rounded bg-white" />
      </label>
      <button type="submit" disabled={pendiente} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-1.5 rounded text-sm font-medium disabled:bg-gray-300">
        {pendiente ? 'Generando…' : 'Generar sueldos del mes'}
      </button>
      {estado?.ok && <span className="text-sm text-emerald-700">✓ {estado.ok}</span>}
      {estado?.error && <span className="text-sm text-red-700">⚠ {estado.error}</span>}
    </form>
  );
}

// ---------------------------------------------------------------------
// Form de configurar sueldo mensual de un conserje
// ---------------------------------------------------------------------
export function SueldoMensualForm({ usuarioId, sueldoActual }: { usuarioId: string; sueldoActual: number | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoNomina | null, FormData>(actualizarSueldoConserje, null);
  return (
    <form action={accion} className="inline-flex items-center gap-1">
      <input type="hidden" name="usuario_id" value={usuarioId} />
      <span className="text-xs">$</span>
      <input type="number" name="sueldo_mensual_usd" step="0.01" min={0} defaultValue={sueldoActual ?? ''} className="w-20 text-xs px-1.5 py-1 border border-[var(--border)] rounded" />
      <button type="submit" disabled={pendiente} className="text-xs px-2 py-1 bg-[var(--primary)] text-white rounded">
        {pendiente ? '…' : 'OK'}
      </button>
      {estado?.error && <span className="text-xs text-red-700 ml-1">{estado.error}</span>}
    </form>
  );
}

// ---------------------------------------------------------------------
// Botón para marcar nómina pagada / revertir
// ---------------------------------------------------------------------
export function NominaPagar({ nominaId, estado: estadoActual }: { nominaId: string; estado: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoNomina | null, FormData>(
    estadoActual === 'pagada' ? revertirNominaPagada : marcarNominaPagada,
    null,
  );
  const [mostrandoFecha, setMostrandoFecha] = useState(false);

  if (estadoActual === 'pagada') {
    return (
      <form action={accion} className="inline-block">
        <input type="hidden" name="nomina_id" value={nominaId} />
        <button type="submit" disabled={pendiente} className="text-xs px-2 py-1 border border-[var(--border)] rounded text-[var(--muted)] hover:bg-[var(--background)]">
          ↺ Revertir
        </button>
      </form>
    );
  }
  if (!mostrandoFecha) {
    return (
      <button type="button" onClick={() => setMostrandoFecha(true)} className="text-xs px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-100">
        Marcar pagada
      </button>
    );
  }
  return (
    <form action={accion} className="inline-flex items-center gap-1">
      <input type="hidden" name="nomina_id" value={nominaId} />
      <input type="date" name="fecha_pago" required defaultValue={hoyISO()} max={hoyISO()} className="text-xs px-1.5 py-1 border border-[var(--border)] rounded" />
      <button type="submit" disabled={pendiente} className="text-xs px-2 py-1 bg-emerald-600 text-white rounded">✓</button>
      <button type="button" onClick={() => setMostrandoFecha(false)} className="text-xs text-[var(--muted)]">×</button>
      {estado?.error && <span className="text-xs text-red-700 ml-1">{estado.error}</span>}
    </form>
  );
}

// ---------------------------------------------------------------------
// Form para crear bono / pago puntual
// ---------------------------------------------------------------------
interface UsuarioOpcion { id: string; nombre: string; rol: string; }

export function BonoForm({ usuarios }: { usuarios: UsuarioOpcion[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoNomina | null, FormData>(crearBono, null);
  const [abierto, setAbierto] = useState(false);

  if (estado?.ok && abierto) setAbierto(false);

  return (
    <div>
      {!abierto ? (
        <button type="button" onClick={() => setAbierto(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-sm font-medium">
          + Bono / pago puntual
        </button>
      ) : (
        <form action={accion} className="bg-amber-50 border border-amber-300 rounded p-4 grid sm:grid-cols-2 gap-3 text-sm">
          <label>
            <span className="text-[var(--muted)]">Empleado</span>
            <select name="usuario_id" required className="mt-1 w-full px-2 py-1 border rounded bg-white">
              <option value="">— elegir —</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
            </select>
          </label>
          <label>
            <span className="text-[var(--muted)]">Concepto</span>
            <input type="text" name="concepto" required maxLength={200} placeholder="Bono navideño, aguinaldo, etc." className="mt-1 w-full px-2 py-1 border rounded bg-white" />
          </label>
          <label>
            <span className="text-[var(--muted)]">Monto (USD)</span>
            <input type="number" name="monto_usd" step="0.01" min={0.01} required className="mt-1 w-full px-2 py-1 border rounded bg-white" />
          </label>
          <label>
            <span className="text-[var(--muted)]">Fecha</span>
            <input type="date" name="fecha" required defaultValue={hoyISO()} className="mt-1 w-full px-2 py-1 border rounded bg-white" />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={pendiente} className="bg-[var(--primary)] text-white px-3 py-1.5 rounded text-sm font-medium">
              {pendiente ? 'Guardando…' : 'Crear'}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="text-sm text-[var(--muted)]">Cancelar</button>
          </div>
          {estado?.error && <p className="sm:col-span-2 text-sm text-red-800">⚠ {estado.error}</p>}
        </form>
      )}
    </div>
  );
}
