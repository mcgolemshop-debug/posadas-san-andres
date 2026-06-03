import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirRol } from '@/lib/auth/session';
import { PagoFormCrear } from '@/components/pago-form-crear';
import { EliminarPagoBtn } from '@/components/eliminar-pago-btn';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagos' };

const CANALES_LABEL: Record<string, string> = {
  zelle: 'Zelle',
  binance: 'Binance',
  banco_panama: 'Banco Panamá',
  banco_venezuela: 'Banco Venezuela',
  efectivo: 'Efectivo',
};

interface PageProps {
  searchParams: Promise<{ canal?: string }>;
}

export default async function PagosPage({ searchParams }: PageProps) {
  const sesion = await exigirRol(['dueno', 'contador']);
  const { canal } = await searchParams;
  const supabase = await createClient();

  // Pagos con filtro opcional por canal
  let q = supabase
    .from('pagos')
    .select(
      'id, monto_bruto_usd, comision_retenida_usd, monto_neto_usd, canal, fecha_pago, notas, reservas(id, cliente_nombre, posadas(nombre))',
    )
    .is('eliminado_at', null)
    .order('fecha_pago', { ascending: false })
    .limit(500);
  if (canal && canal in CANALES_LABEL) q = q.eq('canal', canal);
  const { data: pagos } = await q;
  const items = pagos ?? [];

  // Totales por canal
  const totales: Record<string, { bruto: number; neto: number; cantidad: number }> = {};
  for (const c of Object.keys(CANALES_LABEL)) totales[c] = { bruto: 0, neto: 0, cantidad: 0 };
  for (const p of items) {
    const c = p.canal as string;
    if (!totales[c]) totales[c] = { bruto: 0, neto: 0, cantidad: 0 };
    totales[c].bruto += Number(p.monto_bruto_usd);
    totales[c].neto += Number(p.monto_neto_usd);
    totales[c].cantidad += 1;
  }

  // Reservas confirmadas para el dropdown del form
  const { data: reservasConfirmadas } = await supabase
    .from('reservas')
    .select('id, cliente_nombre, total_usd, fecha_inicio, posadas(nombre)')
    .eq('estado', 'confirmada')
    .is('eliminada_at', null)
    .order('fecha_inicio', { ascending: false })
    .limit(100);
  const reservasOpts = (reservasConfirmadas ?? []).map((r) => {
    const posada = pickFirst<{ nombre: string }>(r.posadas);
    return {
      id: r.id as string,
      cliente_nombre: r.cliente_nombre as string,
      total_usd: Number(r.total_usd),
      posada_nombre: posada?.nombre ?? '—',
      fecha_inicio: r.fecha_inicio as string,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Pagos por canal</h1>
        <span className="text-sm text-[var(--muted)]">{items.length} pagos registrados</span>
      </div>

      {sesion.perfil.rol === 'dueno' && <PagoFormCrear reservas={reservasOpts} />}

      {/* Totales por canal */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {Object.entries(CANALES_LABEL).map(([v, l]) => {
          const t = totales[v];
          return (
            <Link
              key={v}
              href={`/admin/pagos?canal=${v}`}
              className={`block p-3 bg-[var(--surface)] border rounded-lg hover:shadow ${canal === v ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)]'}`}
            >
              <p className="text-xs text-[var(--muted)]">{l}</p>
              <p className="text-lg font-bold text-[var(--primary)]">{formatoUSD(t.neto)}</p>
              <p className="text-xs text-[var(--muted)]">{t.cantidad} pagos</p>
            </Link>
          );
        })}
      </div>

      {canal && (
        <div className="mb-4">
          <Link href="/admin/pagos" className="text-xs text-[var(--primary)] underline">
            ← Ver todos los canales
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg p-12 text-center text-[var(--muted)]">
          Aún no hay pagos registrados.
        </div>
      ) : (
        <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                <Th>Fecha</Th>
                <Th>Reserva</Th>
                <Th>Posada</Th>
                <Th>Canal</Th>
                <Th className="text-right">Bruto</Th>
                <Th className="text-right">Comisión</Th>
                <Th className="text-right">Neto</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const reserva = pickFirst<{ id: string; cliente_nombre: string; posadas: unknown }>(p.reservas);
                const posada = reserva ? pickFirst<{ nombre: string }>(reserva.posadas) : null;
                return (
                  <tr key={p.id as string} className="border-b border-[var(--border)] last:border-0">
                    <Td>{formatoFechaCorta(p.fecha_pago as string)}</Td>
                    <Td>
                      {reserva ? (
                        <Link href={`/admin/reservas/${reserva.id}`} className="text-[var(--primary)] hover:underline">
                          {reserva.cliente_nombre}
                        </Link>
                      ) : '—'}
                    </Td>
                    <Td>{posada?.nombre ?? '—'}</Td>
                    <Td>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{CANALES_LABEL[p.canal as string]}</span>
                    </Td>
                    <Td className="text-right">{formatoUSD(Number(p.monto_bruto_usd))}</Td>
                    <Td className="text-right text-amber-700">
                      {Number(p.comision_retenida_usd) > 0 ? `−${formatoUSD(Number(p.comision_retenida_usd))}` : '—'}
                    </Td>
                    <Td className="text-right font-medium text-[var(--primary)]">
                      {formatoUSD(Number(p.monto_neto_usd))}
                    </Td>
                    <Td>
                      {sesion.perfil.rol === 'dueno' && (
                        <EliminarPagoBtn pagoId={p.id as string} />
                      )}
                    </Td>
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

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)] px-4 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}
function pickFirst<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}
