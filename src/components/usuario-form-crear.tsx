'use client';

import { useActionState, useState } from 'react';
import { crearUsuario, toggleActivoUsuario, type EstadoUsuarios } from '@/app/admin/(panel)/usuarios/actions';

export function ToggleUsuario({ usuarioId, activo }: { usuarioId: string; activo: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoUsuarios | null, FormData>(
    toggleActivoUsuario,
    null,
  );

  return (
    <form action={accion}>
      <input type="hidden" name="usuario_id" value={usuarioId} />
      <input type="hidden" name="activo" value={activo ? 'false' : 'true'} />
      <button
        type="submit"
        disabled={pendiente}
        className={`text-xs px-2 py-1 rounded ${
          activo
            ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
        } disabled:opacity-50`}
        title={estado?.error ?? ''}
      >
        {pendiente ? '…' : activo ? 'Desactivar' : 'Reactivar'}
      </button>
      {estado?.error && <span className="ml-2 text-xs text-red-700">{estado.error}</span>}
    </form>
  );
}

interface PosadaOpcion {
  id: string;
  nombre: string;
}

export function UsuarioFormCrear({ posadas }: { posadas: PosadaOpcion[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoUsuarios | null, FormData>(
    crearUsuario,
    null,
  );
  const [rol, setRol] = useState<'dueno' | 'conserje' | 'vulcanos' | 'contador'>('conserje');
  const [abierto, setAbierto] = useState(false);

  // Cerrar el form en éxito
  if (estado?.ok && abierto) {
    setAbierto(false);
  }

  return (
    <div className="mb-6">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="bg-[var(--primary)] hover:bg-[var(--primary-soft)] text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Crear usuario
        </button>
      ) : (
        <form action={accion} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Nuevo usuario</h3>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-[var(--muted)]">Nombre</span>
              <input type="text" name="nombre" required className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--muted)]">Email</span>
              <input type="email" name="email" required className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--muted)]">Contraseña inicial (mín. 8)</span>
              <input type="text" name="password" required minLength={8} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white font-mono" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--muted)]">Teléfono (opcional)</span>
              <input type="tel" name="telefono" className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--muted)]">Rol</span>
              <select
                name="rol"
                value={rol}
                onChange={(e) => setRol(e.target.value as typeof rol)}
                className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
              >
                <option value="dueno">Dueño</option>
                <option value="conserje">Conserje</option>
                <option value="vulcanos">Vulcanos Tours</option>
                <option value="contador">Contador</option>
              </select>
            </label>
            {rol === 'conserje' && (
              <label className="text-sm">
                <span className="text-[var(--muted)]">Posada asignada</span>
                <select
                  name="posada_id"
                  required={rol === 'conserje'}
                  className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
                >
                  <option value="">— elegir —</option>
                  {posadas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {estado?.error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              ⚠ {estado.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pendiente}
            className="mt-4 bg-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {pendiente ? 'Creando…' : 'Crear usuario'}
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
