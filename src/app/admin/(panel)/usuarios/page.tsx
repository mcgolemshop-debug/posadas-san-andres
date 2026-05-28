import { exigirRol } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { UsuarioFormCrear, ToggleUsuario } from '@/components/usuario-form-crear';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Usuarios' };

export default async function UsuariosPage() {
  const sesion = await exigirRol(['dueno']);
  const supabase = await createClient();

  const [usuariosRes, posadasRes] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, email, nombre, telefono, rol, activo, posadas(nombre)')
      .order('rol')
      .order('nombre'),
    supabase.from('posadas').select('id, nombre').eq('activa', true).order('slug'),
  ]);

  const usuarios = usuariosRes.data ?? [];
  const posadas = (posadasRes.data ?? []).map((p) => ({
    id: p.id as string,
    nombre: p.nombre as string,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <span className="text-sm text-[var(--muted)]">{usuarios.length} usuarios</span>
      </div>

      <UsuarioFormCrear posadas={posadas} />

      <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--background)] border-b border-[var(--border)]">
              <Th>Nombre</Th>
              <Th>Email</Th>
              <Th>Rol</Th>
              <Th>Posada</Th>
              <Th>Estado</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const posada = pickFirst<{ nombre: string }>(u.posadas);
              const esYo = u.id === sesion.user_id;
              return (
                <tr key={u.id as string} className="border-b border-[var(--border)] last:border-0">
                  <Td>
                    {u.nombre as string}
                    {esYo && <span className="ml-2 text-xs text-[var(--accent)]">(tú)</span>}
                  </Td>
                  <Td className="text-[var(--muted)]">{u.email as string}</Td>
                  <Td><BadgeRol rol={u.rol as string} /></Td>
                  <Td>{posada?.nombre ?? '—'}</Td>
                  <Td>
                    {u.activo ? (
                      <span className="text-emerald-700 text-xs font-medium">● Activo</span>
                    ) : (
                      <span className="text-gray-500 text-xs">● Inactivo</span>
                    )}
                  </Td>
                  <Td>
                    {!esYo && (
                      <ToggleUsuario usuarioId={u.id as string} activo={u.activo as boolean} />
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Desactivar un usuario le bloquea el acceso al panel sin borrar su historial.
        Las reservas y gastos que registró siguen visibles.
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)] px-4 py-3">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}

function BadgeRol({ rol }: { rol: string }) {
  const map: Record<string, { etiq: string; clases: string }> = {
    dueno: { etiq: 'Dueño', clases: 'bg-violet-100 text-violet-800' },
    conserje: { etiq: 'Conserje', clases: 'bg-sky-100 text-sky-800' },
    vulcanos: { etiq: 'Vulcanos', clases: 'bg-amber-100 text-amber-800' },
    contador: { etiq: 'Contador', clases: 'bg-emerald-100 text-emerald-800' },
  };
  const c = map[rol] ?? { etiq: rol, clases: 'bg-gray-100' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c.clases}`}>
      {c.etiq}
    </span>
  );
}

function pickFirst<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}
