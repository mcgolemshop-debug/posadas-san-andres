import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import { ComisionPagar } from '@/components/comision-pagar';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Comisiones' };

interface PageProps {
  searchParams: Promise<{ estado?: string }>;
}

export default async function ComisionesPage({ searchParams }: PageProps) {
  const sesion = await getSesionAdminEstricto();
  const { estado } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from('comisiones')
    .select(
      'id, monto_usd, porcentaje, estado, fecha_pago, created_at, reservas(id, cliente_nombre, fecha_inicio, posadas(nombre)), beneficiario:usuarios!comisiones_beneficiario_id_fkey(nombre, rol)',
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (estado === 'pendiente' || estado === 'pagada') {
    q = q.eq('estado', estado);
  }

  const { data: comisiones } = await q;
  const items = comisiones ?? [];

  const totalPendientes = items.filter(c => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto_usd), 0);
  const totalPagadas = items.filter(c => c.estado === 'pagada').reduce((s, c) => s + Number(c.monto_usd), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Comisiones</h1>
        <div className="text-sm text-[var(--muted)]">
          <span className="text-amber-700 font-medium">{formatoUSD(totalPendientes)} pendientes</span>
          {' · '}
          <span className="text-emerald-700">{formatoUSD(totalPagadas)} pagadas</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4 text-sm">
        <FiltroLink label="Todas" href="/admin/comisiones" active={!estado} />
        <FiltroLink label="Pendientes" href="/admin/comisiones?estado=pendiente" active={estado === 'pendiente'} />
        <FiltroLink label="Pagadas" href="/admin/comisiones?estado=pagada" active={estado === 'pagada'} />
      </div>

      {items.length === 0 ? (
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg p-12 text-center text-[var(--muted)]">
          No hay comisiones que cumplan los filtros.
        </div>
      ) : (
        <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                <Th>Reserva</Th>
                <Th>Posada</Th>
                <Th>Beneficiario</Th>
                <Th className="text-right">Monto</Th>
                <Th>Estado</Th>
                <Th>Acción</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const reserva = pickFirst<{ id: string; cliente_nombre: string; fecha_inicio: string; posadas: unknown }>(c.reservas);
                const posada = reserva ? pickFirst<{ nombre: string }>(reserva.posadas) : null;
                const beneficiario = pickFirst<{ nombre: string; rol: string }>(c.beneficiario);

                return (
                  <tr key={c.id as string} className="border-b border-[var(--border)] last:border-0">
                    <Td>
                      {reserva ? (
                        <Link href={`/admin/reservas/${reserva.id}`} className="text-[var(--primary)] hover:underline">
                          {reserva.cliente_nombre} · {formatoFechaCorta(reserva.fecha_inicio)}
                        </Link>
                      ) : '—'}
                    </Td>
                    <Td>{posada?.nombre ?? '—'}</Td>
                    <Td>
                      {beneficiario?.nombre}
                      <span className="ml-1 text-xs text-[var(--muted)]">({beneficiario?.rol})</span>
                    </Td>
                    <Td className="text-right font-medium">
                      {formatoUSD(Number(c.monto_usd))}
                      <span className="text-xs text-[var(--muted)] ml-1">({Number(c.porcentaje)}%)</span>
                    </Td>
                    <Td>
                      {c.estado === 'pagada' ? (
                        <span className="text-emerald-700 text-xs font-medium">
                          ✓ Pagada {c.fecha_pago && `el ${formatoFechaCorta(c.fecha_pago as string)}`}
                        </span>
                      ) : c.estado === 'pendiente' ? (
                        <span className="text-amber-700 text-xs font-medium">⏳ Pendiente</span>
                      ) : (
                        <span className="text-gray-500 text-xs">{c.estado}</span>
                      )}
                    </Td>
                    <Td>
                      {sesion.perfil.rol === 'dueno' && (
                        <ComisionPagar comisionId={c.id as string} estado={c.estado as string} />
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--muted)]">
        Las comisiones se generan automáticamente al <strong>confirmar</strong> una reserva con gestor (Vulcanos o conserje). El Dueño marca cuándo las pagó.
      </p>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)] px-4 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}
function FiltroLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href} className={`px-3 py-1 rounded-full border text-xs ${active ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white border-[var(--border)] hover:bg-[var(--background)]'}`}>
      {label}
    </Link>
  );
}
function pickFirst<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}
