import { LoginForm } from './login-form';

export const metadata = { title: 'Iniciar sesión' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold mb-1">Panel administrativo</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Inicia sesión con tu cuenta de Posadas San Andrés.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
