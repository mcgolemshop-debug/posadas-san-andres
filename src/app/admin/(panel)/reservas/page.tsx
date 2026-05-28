import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import { ReservasFiltros } from '@/components/reservas-filtros';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reservas' };

interface PageProps {
  searchParams: Promise<{
    estado?: string;
    posada?: string;
    desde?: string;
    hasta?: string;
  }>;
}

export default async function ReservasPage({ searchParams }: PageProps) {
  await getSesionAdminEstricto();
  const filtros = await searchParams;
  const supabase = await createClient();

  // Para resolver el slug de posada → id
  const { data: posadas } = await supabase.from('posadas').select('id, slug, nombre');
  const idPorSlug = Object.fromEntries((posadas ?? []).map((p) => [p.slug, p.id]));

  // Query con filtros aplicables — RLS filtra por rol automáticamente
  let q = supabase
    .from('reservas')
    .select(
      'id, fecha_inicio, fecha_fin, estado, modalidad, total_usd, cliente_nombre, num_personas, created_at, posadas(slug, nombre), apartamentos(nombre)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filtros.estado) q = q.eq('estado', filtros.estado);
  if (filtros.posada && idPorSlug[filtros.posada]) {
    q = q.eq('posada_id', idPorSlug[filtros.posada]);
  }
  if (filtros.desde) q = q.gte('fecha_inicio', filtros.desde);
  if (filtros.hasta) q = q.lte('fecha_fin', filtros.hasta);

  const { data: reservas, error } = await q;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Reservas</h1>
        <span className="text-sm text-[var(--muted)]">
          {reservas?.length ?? 0} {reservas?.length === 1 ? 'reserva' : 'reservas'}
        </span>
      </div>

      <ReservasFiltros />

      {error && (
        <p className="text-red-700 text-sm">Error: {error.message}</p>
      )}

      {!error && (reservas?.length ?? 0) === 0 && (
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg p-12 text-center text-[var(--muted)]">
          No hay reservas que cumplan los filtros.
        </div>
      )}

      {(reservas?.length ?? 0) > 0 && (
        <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                <Th>Cliente</Th>
                <Th>Posada</Th>
                <Th>Llegada</Th>
                <Th>Salida</Th>
                <Th>Personas</Th>
                <Th className="text-right">Total</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {reservas!.map((r) => {
                const posada = pickFirst<{ slug: string; nombre: string }>(r.posadas);
                const apto = pickFirst<{ nombre: string }>(r.apartamentos);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)] cursor-pointer"
                  >
                    <Td colspan={undefined}>
                      <Link href={`/admin/reservas/${r.id}`} className="block py-1">
                        <p className="font-medium text-[var(--foreground)]">{r.cliente_nombre}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {r.modalidad === 'completa'
                            ? 'Posada completa'
                            : `Apto ${apto?.nombre ?? ''}`}
                        </p>
                      </Link>
                    </Td>
                    <Td>{posada?.nombre ?? '—'}</Td>
                    <Td>{formatoFechaCorta(r.fecha_inicio as string)}</Td>
                    <Td>{formatoFechaCorta(r.fecha_fin as string)}</Td>
                    <Td>{r.num_personas}</Td>
                    <Td className="text-right font-medium">{formatoUSD(Number(r.total_usd))}</Td>
                    <Td><BadgeEstado estado={r.estado as string} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)] px-4 py-3 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '', colspan }: { children: React.ReactNode; className?: string; colspan?: number }) {
  return <td className={`px-4 py-2 ${className}`} colSpan={colspan}>{children}</td>;
}

function BadgeEstado({ estado }: { estado: string }) {
  const config: Record<string, { etiq: string; clases: string }> = {
    pendiente: { etiq: '⏳ Pendiente', clases: 'bg-amber-100 text-amber-800' },
    confirmada: { etiq: '✓ Confirmada', clases: 'bg-emerald-100 text-emerald-800' },
    rechazada: { etiq: '✗ Rechazada', clases: 'bg-red-100 text-red-800' },
    cancelada: { etiq: '🚫 Cancelada', clases: 'bg-gray-100 text-gray-700' },
  };
  const c = config[estado] ?? { etiq: estado, clases: 'bg-gray-100' };
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
