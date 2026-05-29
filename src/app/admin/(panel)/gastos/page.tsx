import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import { GastoFormCrear } from '@/components/gasto-form-crear';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gastos' };

const CATEGORIAS_LABEL: Record<string, string> = {
  electrico: 'Eléctrico',
  aires: 'Aires AC',
  iluminacion: 'Iluminación',
  pintura: 'Pintura',
  seguridad: 'Seguridad',
  reparaciones: 'Reparaciones',
  otros: 'Otros',
};

interface PageProps {
  searchParams: Promise<{ posada?: string; categoria?: string; desde?: string; hasta?: string }>;
}

export default async function GastosPage({ searchParams }: PageProps) {
  const sesion = await getSesionAdminEstricto();
  if (!['dueno', 'conserje', 'contador'].includes(sesion.perfil.rol)) {
    return <p className="text-red-700">Sin acceso al módulo de gastos.</p>;
  }

  const filtros = await searchParams;
  const supabase = await createClient();

  // Posadas para form y filtro
  const { data: posadas } = await supabase.from('posadas').select('id, slug, nombre').eq('activa', true).order('slug');
  const posadasArr = posadas ?? [];
  const idPorSlug = Object.fromEntries(posadasArr.map(p => [p.slug, p.id]));

  // Query gastos con filtros — RLS filtra por rol/posada automáticamente
  let q = supabase
    .from('gastos')
    .select('id, posada_id, categoria, descripcion, monto_usd, fecha, recibo_url, posadas(nombre)')
    .order('fecha', { ascending: false })
    .limit(500);

  if (filtros.posada && idPorSlug[filtros.posada]) q = q.eq('posada_id', idPorSlug[filtros.posada]);
  if (filtros.categoria) q = q.eq('categoria', filtros.categoria);
  if (filtros.desde) q = q.gte('fecha', filtros.desde);
  if (filtros.hasta) q = q.lte('fecha', filtros.hasta);

  const { data: gastos } = await q;
  const gastosArr = gastos ?? [];

  // Total visible
  const total = gastosArr.reduce((s, g) => s + Number(g.monto_usd), 0);

  // Form de crear: solo dueño y conserje
  const puedeCrear = ['dueno', 'conserje'].includes(sesion.perfil.rol);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Gastos</h1>
        <span className="text-sm text-[var(--muted)]">
          {gastosArr.length} gastos · <strong className="text-[var(--foreground)]">{formatoUSD(total)}</strong>
        </span>
      </div>

      {puedeCrear && (
        <GastoFormCrear
          posadas={posadasArr.map(p => ({ id: p.id as string, nombre: p.nombre as string }))}
          posadaForzadaId={sesion.perfil.rol === 'conserje' ? sesion.perfil.posada_id ?? undefined : undefined}
        />
      )}

      {/* Filtros simples como links */}
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <FiltroLink label="Todos" href="/admin/gastos" active={!filtros.categoria && !filtros.posada} />
        {Object.entries(CATEGORIAS_LABEL).map(([v, l]) => (
          <FiltroLink key={v} label={l} href={`/admin/gastos?categoria=${v}`} active={filtros.categoria === v} />
        ))}
      </div>

      {gastosArr.length === 0 ? (
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg p-12 text-center text-[var(--muted)]">
          No hay gastos registrados todavía.
        </div>
      ) : (
        <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                <Th>Fecha</Th>
                <Th>Posada</Th>
                <Th>Categoría</Th>
                <Th>Descripción</Th>
                <Th className="text-right">Monto</Th>
                <Th>Recibo</Th>
              </tr>
            </thead>
            <tbody>
              {gastosArr.map((g) => {
                const posada = pickFirst<{ nombre: string }>(g.posadas);
                return (
                  <tr key={g.id as string} className="border-b border-[var(--border)] last:border-0">
                    <Td>{formatoFechaCorta(g.fecha as string)}</Td>
                    <Td>{posada?.nombre ?? '—'}</Td>
                    <Td><span className="px-2 py-0.5 rounded bg-gray-100 text-xs">{CATEGORIAS_LABEL[g.categoria as string] ?? g.categoria}</span></Td>
                    <Td>{g.descripcion as string}</Td>
                    <Td className="text-right font-medium">{formatoUSD(Number(g.monto_usd))}</Td>
                    <Td>{g.recibo_url ? <span className="text-[var(--accent)]">📎</span> : '—'}</Td>
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
