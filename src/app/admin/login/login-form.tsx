'use client';

import { useActionState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
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
        <span className="text-xs uppercase tracking-widest text-[var(--foreground-muted)] mb-1.5 block">Email</span>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-subtle)]" />
          <input
            type="email" name="email" required autoComplete="email"
            placeholder="tucorreo@gmail.com"
            className="w-full pl-10 pr-3 py-2.5 border border-[var(--border-strong)] rounded-lg bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-widest text-[var(--foreground-muted)] mb-1.5 block">Contraseña</span>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-subtle)]" />
          <input
            type="password" name="password" required autoComplete="current-password"
            placeholder="••••••••"
            className="w-full pl-10 pr-3 py-2.5 border border-[var(--border-strong)] rounded-lg bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition"
          />
        </div>
      </label>

      {estado?.error && (
        <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/30 rounded-lg flex gap-2 text-sm text-[var(--danger)]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{estado.error}</span>
        </div>
      )}

      <button
        type="submit" disabled={pendiente}
        className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--foreground-subtle)] text-white font-semibold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
      >
        {pendiente ? 'Entrando…' : (
          <>Entrar <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </form>
  );
}
