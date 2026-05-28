import Link from 'next/link';
import { getSesionAdminEstricto, type RolUsuario } from '@/lib/auth/session';
import { AdminNav } from '@/components/admin-nav';
import { LogoutButton } from '@/components/logout-button';

// Render dinámico siempre — depende de la sesión
export const dynamic = 'force-dynamic';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Esto redirige a /admin/login si no hay sesión
  const sesion = await getSesionAdminEstricto();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header admin */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-[var(--primary)]">
              Posadas
            </span>
            <span className="text-lg font-light text-[var(--accent)]">San Andrés</span>
            <span className="ml-2 text-xs uppercase tracking-wide text-[var(--muted)] border border-[var(--border)] px-2 py-0.5 rounded">
              Admin
            </span>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-[var(--muted)]">
              {sesion.perfil.nombre}{' '}
              <span className="text-[var(--accent)] font-medium">
                · {etiquetaRol(sesion.perfil.rol)}
              </span>
            </span>
            <LogoutButton />
          </div>
        </div>

        {/* Nav secundaria */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-3">
          <AdminNav rol={sesion.perfil.rol} />
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
        Panel administrativo · Posadas San Andrés
      </footer>
    </div>
  );
}

function etiquetaRol(rol: RolUsuario): string {
  switch (rol) {
    case 'dueno': return 'Dueño';
    case 'conserje': return 'Conserje';
    case 'vulcanos': return 'Vulcanos Tours';
    case 'contador': return 'Contador';
  }
}
