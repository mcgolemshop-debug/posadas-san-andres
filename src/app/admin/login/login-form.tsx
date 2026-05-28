'use client';

import { useActionState } from 'react';
import { iniciarSesion, type EstadoLogin } from './actions';

export function LoginForm({ next }: { next?: string }) {
  const [estado, formAction, pendiente] = useActionState<EstadoLogin | null, FormData>(
    iniciarSesion,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <label className="block">
        <span className="text-sm text-[var(--muted)]">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
        />
      </label>

      <label className="block">
        <span className="text-sm text-[var(--muted)]">Contraseña</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
        />
      </label>

      {estado?.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {estado.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="w-full bg-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-md transition-colors"
      >
        {pendiente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
