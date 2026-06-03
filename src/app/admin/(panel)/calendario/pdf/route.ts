// =====================================================================
// GET /admin/calendario/pdf?mes=YYYY-MM
// Devuelve un PDF con el calendario de ocupación mensual de las 2 posadas.
// =====================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { exigirRol } from '@/lib/auth/session';
import { ReporteCalendarioDoc, type PosadaCalendar } from '@/lib/pdf/reporte-calendario';
import { fechaParaArchivo } from '@/lib/pdf/estilos';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sesion = await exigirRol(['dueno', 'conserje', 'vulcanos', 'contador']);

  const sp = request.nextUrl.searchParams;
  const mesParam = sp.get('mes');
  const ahora = new Date();
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam)
    ? mesParam
    : `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const [anyo, mesNum] = mes.split('-').map(Number);
  const primerDia = `${mes}-01`;
  const ultimoDia = new Date(anyo, mesNum, 0).toISOString().slice(0, 10);
  const primerDiaSig = new Date(anyo, mesNum, 1).toISOString().slice(0, 10);

  const supabase = await createClient();

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

  const { data: reservas } = await supabase
    .from('reservas')
    .select('id, fecha_inicio, fecha_fin, cliente_nombre, modalidad, apartamento_id, apartamentos_ids, posada_id')
    .eq('estado', 'confirmada')
    .is('eliminada_at', null)
    .lt('fecha_inicio', primerDiaSig)
    .gt('fecha_fin', primerDia);

  // Conserje solo ve su posada
  const posadasVisibles = sesion.perfil.rol === 'conserje' && sesion.perfil.posada_id
    ? (posadas ?? []).filter((p) => p.id === sesion.perfil.posada_id)
    : (posadas ?? []);

  const posadasData: PosadaCalendar[] = posadasVisibles.map((p) => {
    const rs = (reservas ?? []).filter((r) => r.posada_id === p.id).map((r) => ({
      id: r.id as string,
      fecha_inicio: r.fecha_inicio as string,
      fecha_fin: r.fecha_fin as string,
      cliente_nombre: r.cliente_nombre as string,
      modalidad: r.modalidad as 'apartamento' | 'completa',
      apartamento_id: r.apartamento_id as string | null,
      apartamentos_ids: (r.apartamentos_ids as string[] | null) ?? null,
    }));
    const filas = p.slug === 'confort'
      ? (aptos ?? [])
          .filter((a) => a.posada_id === p.id)
          .map((a) => ({ id: a.id as string, nombre: a.nombre as string }))
      : [{ id: p.id as string, nombre: 'Casa completa' }];
    return {
      slug: p.slug as 'confort' | 'beach',
      nombre: p.nombre as string,
      filas,
      reservas: rs,
    };
  });

  const generadoEn = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()} ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

  const buffer = await renderToBuffer(
    ReporteCalendarioDoc({ mes, posadas: posadasData, generadoEn }),
  );

  const nombre = `calendario-${mes}-posadas-san-andres-${fechaParaArchivo()}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  });
}
