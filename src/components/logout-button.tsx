import { cerrarSesion } from '@/app/admin/login/actions';

export function LogoutButton() {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-3 py-1.5 rounded-md hover:bg-[var(--background)]"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
