import { LogOut } from 'lucide-react';
import { cerrarSesion } from '@/app/admin/login/actions';

export function LogoutButton() {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        className="w-full flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--danger)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--danger-light)]"
      >
        <LogOut className="w-4 h-4" />
        <span>Cerrar sesión</span>
      </button>
    </form>
  );
}
