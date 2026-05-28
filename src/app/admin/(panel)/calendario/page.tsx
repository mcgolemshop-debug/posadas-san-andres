import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import { CalendarioMes } from '@/components/calendario-mes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendario' };

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

interface PageProps {
  searchParams: Promise<{ mes?: string }>;
}

export default async function CalendarioPage({ searchParams }: PageProps) {
  const sesion = await getSesionAdminEstricto();
  const { mes: mesParam } = await searchParams;

  // Mes a mostrar (default: actual)
  const hoy = new Date();
  const mes =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam)
      ? mesParam
      : `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [anyo, mesNum] = mes.split('-').map(Number);

  // Mes anterior / siguiente
  const anterior = mesAnterior(anyo, mesNum);
  const siguiente = mesSiguiente(anyo, mesNum);

  const supabase = await createClient();

  // Posadas y apartamentos
  const { data: posadas } = await supabase
    .from('posadas')
    .select('id, slug, nombre')
    .eq('activa', true)
    .order('slug');
  const { data: aptos } = await supabase
    .from('apartamentos')
    .select('id, nombre, posada_id, orden')
    .eq('activo', true)
    .order('orden');

  // Reservas confirmadas que tocan el mes
  // (fecha_inicio < primer día del mes siguiente) Y (fecha_fin > primer día del mes)
  const primerDiaMes = `${anyo}-${String(mesNum).padStart(2, '0')}-01`;
  const primerDiaSiguiente = `${siguiente.anyo}-${String(siguiente.mes).padStart(2, '0')}-01`;
  const { data: reservas } = await supabase
    .from('reservas')
    .select('id, fecha_inicio, fecha_fin, cliente_nombre, modalidad, apartamento_id, posada_id')
    .eq('estado', 'confirmada')
    .lt('fecha_inicio', primerDiaSiguiente)
    .gt('fecha_fin', primerDiaMes);

  // Para conserje: limitar a su posada (RLS también lo hace pero filtramos UI)
  const posadasVisibles =
    sesion.perfil.rol === 'conserje' && sesion.perfil.posada_id
      ? (posadas ?? []).filter((p) => p.id === sesion.perfil.posada_id)
      : (posadas ?? []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">
          Calendario · {MESES_ES[mesNum - 1]} {anyo}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/admin/calendario?mes=${anterior.anyo}-${String(anterior.mes).padStart(2, '0')}`}
            className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-[var(--background)] text-sm"
          >
            ← Anterior
          </Link>
          <Link
            href="/admin/calendario"
            className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-[var(--background)] text-sm"
          >
            Hoy
          </Link>
          <Link
            href={`/admin/calendario?mes=${siguiente.anyo}-${String(siguiente.mes).padStart(2, '0')}`}
            className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-[var(--background)] text-sm"
          >
            Siguiente →
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        {posadasVisibles.map((p) => {
          const reservasPosada = (reservas ?? []).filter((r) => r.posada_id === p.id);
          let filas: { id: string; nombre: string }[];

          if (p.slug === 'confort') {
            filas = (aptos ?? [])
              .filter((a) => a.posada_id === p.id)
              .map((a) => ({ id: a.id as string, nombre: a.nombre as string }));
          } else {
            // Beach: una sola fila
            filas = [{ id: p.id as string, nombre: 'Casa completa' }];
          }

          return (
            <CalendarioMes
              key={p.id as string}
              mes={mes}
              posadaNombre={p.nombre as string}
              filas={filas}
              reservas={reservasPosada.map((r) => ({
                id: r.id as string,
                fecha_inicio: r.fecha_inicio as string,
                fecha_fin: r.fecha_fin as string,
                cliente_nombre: r.cliente_nombre as string,
                modalidad: r.modalidad as 'apartamento' | 'completa',
                apartamento_id: r.apartamento_id as string | null,
              }))}
              // En Beach todas las reservas son "completa" para nuestra grilla unifila.
              esCompleta={(r) => p.slug === 'beach' || r.modalidad === 'completa'}
            />
          );
        })}

        {posadasVisibles.length === 0 && (
          <p className="text-[var(--muted)] italic">No tienes posadas asignadas.</p>
        )}
      </div>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Las celdas coloreadas son reservas <strong>confirmadas</strong>. Click para abrir el detalle.
        Las pendientes no aparecen aquí (no bloquean fechas hasta que se confirmen).
      </p>
    </div>
  );
}

function mesAnterior(a: number, m: number) {
  return m === 1 ? { anyo: a - 1, mes: 12 } : { anyo: a, mes: m - 1 };
}
function mesSiguiente(a: number, m: number) {
  return m === 12 ? { anyo: a + 1, mes: 1 } : { anyo: a, mes: m + 1 };
}
