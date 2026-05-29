'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck2,
  CalendarRange,
  Receipt,
  HandCoins,
  CreditCard,
  Users2,
  Building2,
  BarChart3,
  UserCog,
} from 'lucide-react';
import type { RolUsuario } from '@/lib/auth/session';

interface ItemNav {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: RolUsuario[];
}

const ITEMS: ItemNav[] = [
  { href: '/admin', label: 'Inicio', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['dueno', 'conserje', 'vulcanos', 'contador'] },
  { href: '/admin/reservas', label: 'Reservas', icon: <CalendarCheck2 className="w-5 h-5" />, roles: ['dueno', 'conserje', 'vulcanos', 'contador'] },
  { href: '/admin/calendario', label: 'Calendario', icon: <CalendarRange className="w-5 h-5" />, roles: ['dueno', 'conserje', 'vulcanos', 'contador'] },
  { href: '/admin/gastos', label: 'Gastos', icon: <Receipt className="w-5 h-5" />, roles: ['dueno', 'conserje', 'contador'] },
  { href: '/admin/comisiones', label: 'Comisiones', icon: <HandCoins className="w-5 h-5" />, roles: ['dueno', 'vulcanos', 'conserje', 'contador'] },
  { href: '/admin/pagos', label: 'Pagos', icon: <CreditCard className="w-5 h-5" />, roles: ['dueno', 'contador'] },
  { href: '/admin/nomina', label: 'Nómina', icon: <Users2 className="w-5 h-5" />, roles: ['dueno', 'contador'] },
  { href: '/admin/reportes', label: 'Reportes', icon: <BarChart3 className="w-5 h-5" />, roles: ['dueno', 'contador'] },
  { href: '/admin/usuarios', label: 'Usuarios', icon: <UserCog className="w-5 h-5" />, roles: ['dueno'] },
  { href: '/admin/posadas', label: 'Posadas', icon: <Building2 className="w-5 h-5" />, roles: ['dueno'] },
];

export function AdminNav({ rol }: { rol: RolUsuario }) {
  const pathname = usePathname();
  const visibles = ITEMS.filter((i) => i.roles.includes(rol));

  return (
    <nav className="px-3 py-2 space-y-0.5">
      {visibles.map((i) => {
        const activo =
          i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
              activo
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]'
            }`}
          >
            <span className={activo ? 'text-white' : 'text-[var(--foreground-subtle)] group-hover:text-[var(--primary)]'}>
              {i.icon}
            </span>
            <span>{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
