import Link from 'next/link';
import { Waves } from 'lucide-react';
import { getSesionAdminEstricto, type RolUsuario } from '@/lib/auth/session';
import { AdminNav } from '@/components/admin-nav';
import { AdminSidebarMobile } from '@/components/admin-sidebar-mobile';
import { LogoutButton } from '@/components/logout-button';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesionAdminEstricto();
  const iniciales = sesion.perfil.nombre
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[270px_1fr]">
      {/* ============ SIDEBAR (desktop) ============ */}
      <aside className="hidden lg:flex flex-col bg-[var(--surface)] border-r border-[var(--border)] sticky top-0 h-screen">
        {/* Logo */}
        <Link href="/admin" className="flex items-center gap-2.5 p-5 border-b border-[var(--border-subtle)]">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white shadow">
            <Waves className="w-5 h-5" strokeWidth={2.25} />
          </span>
          <span className="flex items-baseline gap-1">
            <span className="font-display text-lg font-semibold text-[var(--primary)]">Posadas</span>
            <span className="font-display text-lg italic text-[var(--accent)]">San Andrés</span>
          </span>
        </Link>

        {/* Nav scrollable */}
        <div className="flex-1 overflow-y-auto py-3">
          <AdminNav rol={sesion.perfil.rol} />
        </div>

        {/* Usuario abajo */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {iniciales || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {sesion.perfil.nombre}
              </p>
              <p className="text-xs text-[var(--foreground-subtle)]">{etiquetaRol(sesion.perfil.rol)}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <div className="flex flex-col min-w-0">
        {/* Header móvil */}
        <header className="lg:hidden sticky top-0 z-20 bg-[var(--surface)]/90 backdrop-blur border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white">
              <Waves className="w-4 h-4" />
            </span>
            <span className="font-display text-base font-semibold text-[var(--primary)]">Posadas</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--foreground-muted)] hidden sm:inline">
              {etiquetaRol(sesion.perfil.rol)}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xs font-semibold">
              {iniciales || '?'}
            </div>
            <AdminSidebarMobile rol={sesion.perfil.rol} />
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-[var(--border-subtle)] py-4 text-center text-xs text-[var(--foreground-subtle)]">
          Panel administrativo · Posadas San Andrés
        </footer>
      </div>
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
