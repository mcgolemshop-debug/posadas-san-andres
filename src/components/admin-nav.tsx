'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { RolUsuario } from '@/lib/auth/session';

interface ItemNav {
  href: string;
  label: string;
  roles: RolUsuario[];
}

const ITEMS: ItemNav[] = [
  { href: '/admin', label: 'Inicio', roles: ['dueno', 'conserje', 'vulcanos', 'contador'] },
  { href: '/admin/reservas', label: 'Reservas', roles: ['dueno', 'conserje', 'vulcanos', 'contador'] },
  { href: '/admin/calendario', label: 'Calendario', roles: ['dueno', 'conserje', 'vulcanos', 'contador'] },
  { href: '/admin/gastos', label: 'Gastos', roles: ['dueno', 'conserje', 'contador'] },
  { href: '/admin/comisiones', label: 'Comisiones', roles: ['dueno', 'vulcanos', 'conserje', 'contador'] },
  { href: '/admin/pagos', label: 'Pagos', roles: ['dueno', 'contador'] },
  { href: '/admin/nomina', label: 'Nómina', roles: ['dueno', 'contador'] },
  { href: '/admin/reportes', label: 'Reportes', roles: ['dueno', 'contador'] },
  { href: '/admin/usuarios', label: 'Usuarios', roles: ['dueno'] },
  { href: '/admin/posadas', label: 'Posadas y precios', roles: ['dueno'] },
];

export function AdminNav({ rol }: { rol: RolUsuario }) {
  const pathname = usePathname();
  const visibles = ITEMS.filter((i) => i.roles.includes(rol));

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {visibles.map((i) => {
        const activo =
          i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activo
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--foreground)] hover:bg-[var(--background)]'
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
