import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirRol } from '@/lib/auth/session';
import { formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reportes' };

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

interface PageProps {
  searchParams: Promise<{ mes?: string }>;
}

export default async function ReportesPage({ searchParams }: PageProps) {
  await exigirRol(['dueno', 'contador']);
  const { mes: mesParam } = await searchParams;

  const hoy = new Date();
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam)
    ? mesParam
    : `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [anyo, mesNum] = mes.split('-').map(Number);
  const primerDia = `${mes}-01`;
  const ultimoDia = new Date(anyo, mesNum, 0).toISOString().slice(0, 10);

  const supabase = await createClient();

  // Consultas paralelas
  const [pagosRes, gastosRes, comisionesRes, nominaRes, reservasRes] = await Promise.all([
    supabase
      .from('pagos')
      .select('monto_bruto_usd, comision_retenida_usd, monto_neto_usd, canal')
      .gte('fecha_pago', primerDia)
      .lte('fecha_pago', ultimoDia),
    supabase
      .from('gastos')
      .select('monto_usd, categoria, posada_id, posadas(nombre)')
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia),
    supabase
      .from('comisiones')
      .select('monto_usd, estado')
      .eq('estado', 'pagada')
      .gte('fecha_pago', primerDia)
      .lte('fecha_pago', ultimoDia),
    supabase
      .from('nomina')
      .select('monto_usd, concepto')
      .eq('estado', 'pagada')
      .gte('fecha_pago', primerDia)
      .lte('fecha_pago', ultimoDia),
    supabase
      .from('reservas')
      .select('id, total_usd, estado')
      .eq('estado', 'confirmada')
      .is('eliminada_at', null)
      .gte('confirmada_at', `${primerDia}T00:00:00`)
      .lte('confirmada_at', `${ultimoDia}T23:59:59`),
  ]);

  const ingresoBruto = (pagosRes.data ?? []).reduce((s, p) => s + Number(p.monto_bruto_usd), 0);
  const ingresoNeto = (pagosRes.data ?? []).reduce((s, p) => s + Number(p.monto_neto_usd), 0);
  const totalGastos = (gastosRes.data ?? []).reduce((s, g) => s + Number(g.monto_usd), 0);
  const totalComisiones = (comisionesRes.data ?? []).reduce((s, c) => s + Number(c.monto_usd), 0);
  const totalNomina = (nominaRes.data ?? []).reduce((s, n) => s + Number(n.monto_usd), 0);

  // Rentabilidad final
  const utilidad = ingresoNeto - totalGastos - totalComisiones - totalNomina;

  // Gastos por categoría
  const gastosPorCategoria = new Map<string, number>();
  for (const g of gastosRes.data ?? []) {
    gastosPorCategoria.set(g.categoria as string, (gastosPorCategoria.get(g.categoria as string) ?? 0) + Number(g.monto_usd));
  }

  // Pagos por canal
  const pagosPorCanal = new Map<string, number>();
  for (const p of pagosRes.data ?? []) {
    pagosPorCanal.set(p.canal as string, (pagosPorCanal.get(p.canal as string) ?? 0) + Number(p.monto_neto_usd));
  }

  // Navegación mes anterior/siguiente
  const anterior = mesNum === 1 ? `${anyo - 1}-12` : `${anyo}-${String(mesNum - 1).padStart(2, '0')}`;
  const siguiente = mesNum === 12 ? `${anyo + 1}-01` : `${anyo}-${String(mesNum + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Reporte · {MESES_ES[mesNum - 1]} {anyo}
        </h1>
        <div className="flex gap-2">
          <Link href={`/admin/reportes?mes=${anterior}`} className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-[var(--background)] text-sm">← Anterior</Link>
          <Link href="/admin/reportes" className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-[var(--background)] text-sm">Hoy</Link>
          <Link href={`/admin/reportes?mes=${siguiente}`} className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-[var(--background)] text-sm">Siguiente →</Link>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Tarjeta titulo="Ingreso bruto" valor={formatoUSD(ingresoBruto)} sub={`${(pagosRes.data ?? []).length} pagos`} color="text-emerald-700" />
        <Tarjeta titulo="Comisiones pagadas" valor={formatoUSD(totalComisiones)} sub="−" color="text-amber-700" />
        <Tarjeta titulo="Gastos operativos" valor={formatoUSD(totalGastos)} sub={`${(gastosRes.data ?? []).length} gastos`} color="text-red-700" />
        <Tarjeta titulo="Nómina pagada" valor={formatoUSD(totalNomina)} sub="−" color="text-red-700" />
      </div>

      {/* Utilidad neta */}
      <div className={`p-6 rounded-xl ${utilidad >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
        <p className="text-sm uppercase tracking-widest text-[var(--muted)] mb-1">
          Utilidad neta del mes (ingreso neto − gastos − comisiones − nómina)
        </p>
        <p className={`text-4xl font-bold ${utilidad >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {formatoUSD(utilidad)}
        </p>
      </div>

      {/* Detalle por categoría / canal */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
          <h3 className="font-semibold mb-3">Pagos por canal (neto)</h3>
          {pagosPorCanal.size === 0 ? (
            <p className="text-sm text-[var(--muted)]">Sin pagos.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {Array.from(pagosPorCanal.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([canal, monto]) => (
                  <li key={canal} className="flex justify-between">
                    <span className="capitalize">{canal.replace('_', ' ')}</span>
                    <strong>{formatoUSD(monto)}</strong>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
          <h3 className="font-semibold mb-3">Gastos por categoría</h3>
          {gastosPorCategoria.size === 0 ? (
            <p className="text-sm text-[var(--muted)]">Sin gastos.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {Array.from(gastosPorCategoria.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([categoria, monto]) => (
                  <li key={categoria} className="flex justify-between">
                    <span className="capitalize">{categoria}</span>
                    <strong>{formatoUSD(monto)}</strong>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* Exportar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
        <h3 className="font-semibold mb-2">Exportar para Contador</h3>
        <p className="text-sm text-[var(--muted)] mb-3">
          Descarga un CSV con todos los movimientos del mes (ingresos, gastos, comisiones pagadas, nómina pagada).
          Lo puedes abrir directamente en Excel o Google Sheets.
        </p>
        <a
          href={`/admin/reportes/exportar?mes=${mes}`}
          className="inline-block bg-[var(--primary)] hover:bg-[var(--primary-soft)] text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          📥 Descargar movimientos {MESES_ES[mesNum - 1]} {anyo}.csv
        </a>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Reservas confirmadas este mes: {(reservasRes.data ?? []).length}
      </p>
    </div>
  );
}

function Tarjeta({ titulo, valor, sub, color }: { titulo: string; valor: string; sub: string; color: string }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--muted)]">{titulo}</p>
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-[var(--muted)]">{sub}</p>
    </div>
  );
}
