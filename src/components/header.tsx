'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Waves, Home } from 'lucide-react';

/**
 * Header de la cara pública. Se oculta en /admin/*.
 */
export function Header() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface)]/85 backdrop-blur-lg sticky top-0 z-30">
      <nav className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow">
            <Waves className="w-5 h-5" strokeWidth={2.25} />
          </span>
          <span className="flex items-baseline gap-1">
            <span className="font-display text-xl sm:text-2xl font-semibold text-[var(--primary)] tracking-tight">
              Posadas
            </span>
            <span className="font-display text-xl sm:text-2xl italic text-[var(--accent)]">
              San Andrés
            </span>
          </span>
        </Link>
        <ul className="hidden sm:flex items-center gap-1 text-sm">
          <li>
            <Link
              href="/posada/confort"
              className="px-4 py-2 rounded-full text-[var(--foreground)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors font-medium"
            >
              Confort
            </Link>
          </li>
          <li>
            <Link
              href="/posada/beach"
              className="px-4 py-2 rounded-full text-[var(--foreground)] hover:bg-[var(--secondary-light)] hover:text-[var(--primary)] transition-colors font-medium"
            >
              Beach
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
