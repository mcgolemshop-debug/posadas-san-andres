import Link from 'next/link';
import { Waves, ShieldCheck } from 'lucide-react';
import { LoginForm } from './login-form';

export const metadata = { title: 'Iniciar sesión' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[var(--background)] via-[var(--surface-elevated)] to-[var(--accent-light)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white shadow-md">
            <Waves className="w-6 h-6" strokeWidth={2.25} />
          </span>
          <span className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-semibold text-[var(--primary)]">Posadas</span>
            <span className="font-display text-2xl italic text-[var(--accent)]">San Andrés</span>
          </span>
        </Link>

        {/* Tarjeta de login */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />
            <h1 className="font-display text-2xl">Panel administrativo</h1>
          </div>
          <p className="text-sm text-[var(--foreground-muted)] mb-6">
            Inicia sesión con tu cuenta del equipo.
          </p>
          <LoginForm next={next} />
        </div>

        <p className="text-center text-xs text-[var(--foreground-subtle)] mt-5">
          ¿No tienes cuenta? Solicítala al Dueño.
        </p>
      </div>
    </div>
  );
}
