import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirRol } from '@/lib/auth/session';
import {
  GenerarNominaMes,
  SueldoMensualForm,
  NominaPagar,
  BonoForm,
} from '@/components/nomina-controles';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nómina' };

interface PageProps {
  searchParams: Promise<{ mes?: string; estado?: string }>;
}

export default async function NominaPage({ searchParams }: PageProps) {
  const sesion = await exigirRol(['dueno', 'contador']);
  const { mes, estado: estadoFiltro } = await searchParams;
  const supabase = await createClient();

  // Conserjes con su sueldo configurado
  const { data: conserjes } = await supabase
    .from('usuarios')
    .select('id, nombre, sueldo_mensual_usd, activo, posadas(nombre)')
    .eq('rol', 'conserje')
    .order('nombre');

  // Todos los empleados (para el form de bono)
  const { data: empleados } = await supabase
    .from('usuarios')
    .select('id, nombre, rol')
    .eq('activo', true)
    .neq('rol', 'contador')
    .order('nombre');

  // Pagos de nómina
  let q = supabase
    .from('nomina')
    .select('id, periodo_inicio, periodo_fin, concepto, monto_usd, estado, fecha_pago, usuarios(nombre, rol), posadas(nombre)')
    .order('periodo_inicio', { ascending: false })
    .limit(500);
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const inicio = `${mes}-01`;
    const fin = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).toISOString().slice(0, 10);
    q = q.gte('periodo_inicio', inicio).lte('periodo_fin', fin);
  }
  if (estadoFiltro === 'pendiente' || estadoFiltro === 'pagada') {
    q = q.eq('estado', estadoFiltro);
  }
  const { data: pagos } = await q;
  const items = pagos ?? [];

  const totalPendientes = items.filter(p => p.estado === 'pendiente').reduce((s, p) => s + Number(p.monto_usd), 0);
  const totalPagadas = items.filter(p => p.estado === 'pagada').reduce((s, p) => s + Number(p.monto_usd), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Nómina</h1>
        <p className="text-[var(--muted)] text-sm">
          Sueldos mensuales fijos de conserjes + bonos y pagos puntuales.
        </p>
      </div>

      {/* Sueldos configurados */}
      {sesion.perfil.rol === 'dueno' && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Sueldos mensuales configurados</h2>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                  <Th>Conserje</Th>
                  <Th>Posada</Th>
                  <Th>Estado</Th>
                  <Th>Sueldo mensual</Th>
                </tr>
              </thead>
              <tbody>
                {(conserjes ?? []).map((c) => {
                  const posada = pickFirst<{ nombre: string }>(c.posadas);
                  return (
                    <tr key={c.id as string} className="border-b border-[var(--border)] last:border-0">
                      <Td>{c.nombre as string}</Td>
                      <Td>{posada?.nombre ?? '—'}</Td>
                      <Td>
                        {c.activo ? <span className="text-emerald-700 text-xs">Activo</span> : <span className="text-gray-500 text-xs">Inactivo</span>}
                      </Td>
                      <Td>
                        <SueldoMensualForm usuarioId={c.id as string} sueldoActual={c.sueldo_mensual_usd as number | null} />
                      </Td>
                    </tr>
                  );
                })}
                {(conserjes ?? []).length === 0 && (
                  <tr><td colSpan={4} className="text-center text-[var(--muted)] p-6">No hay conserjes registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Generar nómina + bono */}
      {sesion.perfil.rol === 'dueno' && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Acciones</h2>
          <div className="flex flex-wrap items-end gap-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
            <GenerarNominaMes />
            <div className="w-px h-10 bg-[var(--border)] hidden sm:block" />
            <BonoForm usuarios={(empleados ?? []).map(e => ({ id: e.id as string, nombre: e.nombre as string, rol: e.rol as string }))} />
          </div>
        </section>
      )}

      {/* Listado */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Historial de pagos</h2>
          <div className="text-sm text-[var(--muted)]">
            <span className="text-amber-700">{formatoUSD(totalPendientes)} pendiente</span>
            {' · '}
            <span className="text-emerald-700">{formatoUSD(totalPagadas)} pagado</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4 text-sm flex-wrap">
          <FiltroLink label="Todo" href="/admin/nomina" active={!estadoFiltro && !mes} />
          <FiltroLink label="Pendientes" href="/admin/nomina?estado=pendiente" active={estadoFiltro === 'pendiente'} />
          <FiltroLink label="Pagadas" href="/admin/nomina?estado=pagada" active={estadoFiltro === 'pagada'} />
        </div>

        {items.length === 0 ? (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg p-12 text-center text-[var(--muted)]">
            No hay pagos de nómina registrados con esos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                  <Th>Empleado</Th>
                  <Th>Posada</Th>
                  <Th>Concepto</Th>
                  <Th>Periodo</Th>
                  <Th className="text-right">Monto</Th>
                  <Th>Estado</Th>
                  {sesion.perfil.rol === 'dueno' && <Th>Acción</Th>}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const usuario = pickFirst<{ nombre: string; rol: string }>(p.usuarios);
                  const posada = pickFirst<{ nombre: string }>(p.posadas);
                  return (
                    <tr key={p.id as string} className="border-b border-[var(--border)] last:border-0">
                      <Td>
                        {usuario?.nombre}
                        <span className="ml-1 text-xs text-[var(--muted)]">({usuario?.rol})</span>
                      </Td>
                      <Td>{posada?.nombre ?? '—'}</Td>
                      <Td className="capitalize">{p.concepto as string}</Td>
                      <Td className="text-xs">
                        {p.periodo_inicio === p.periodo_fin
                          ? formatoFechaCorta(p.periodo_inicio as string)
                          : `${formatoFechaCorta(p.periodo_inicio as string)} → ${formatoFechaCorta(p.periodo_fin as string)}`}
                      </Td>
                      <Td className="text-right font-medium">{formatoUSD(Number(p.monto_usd))}</Td>
                      <Td>
                        {p.estado === 'pagada' ? (
                          <span className="text-emerald-700 text-xs">✓ Pagada {p.fecha_pago && `el ${formatoFechaCorta(p.fecha_pago as string)}`}</span>
                        ) : (
                          <span className="text-amber-700 text-xs">⏳ Pendiente</span>
                        )}
                      </Td>
                      {sesion.perfil.rol === 'dueno' && (
                        <Td>
                          <NominaPagar nominaId={p.id as string} estado={p.estado as string} />
                        </Td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
