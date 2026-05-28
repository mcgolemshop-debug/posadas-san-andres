'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Header de la cara pública. NO se muestra en rutas /admin/*
 * (esas tienen su propia barra de navegación admin).
 */
export function Header() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur sticky top-0 z-30">
      <nav className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-baseline gap-1 group">
          <span className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--primary)] group-hover:text-[var(--primary-soft)] transition-colors">
            Posadas
          </span>
          <span className="text-xl sm:text-2xl font-light tracking-wide text-[var(--accent)]">
            San Andrés
          </span>
        </Link>
        <ul className="hidden sm:flex items-center gap-1 text-sm">
          <li>
            <Link
              href="/posada/confort"
              className="px-3 py-2 rounded-md text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
            >
              Confort
            </Link>
          </li>
          <li>
            <Link
              href="/posada/beach"
              className="px-3 py-2 rounded-md text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
            >
              Beach
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
