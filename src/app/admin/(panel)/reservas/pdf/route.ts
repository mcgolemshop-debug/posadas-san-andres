// =====================================================================
// GET /admin/reservas/pdf?posada=&estado=&desde=&hasta=
// Devuelve un PDF con el reporte de reservas filtradas.
// =====================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { exigirRol } from '@/lib/auth/session';
import { ReporteReservasDoc, type ReservaPdf } from '@/lib/pdf/reporte-reservas';
import { fechaParaArchivo } from '@/lib/pdf/estilos';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  await exigirRol(['dueno', 'conserje', 'vulcanos', 'contador']);

  const sp = request.nextUrl.searchParams;
  const filtros = {
    posada: sp.get('posada') ?? undefined,
    estado: sp.get('estado') ?? undefined,
    desde: sp.get('desde') ?? undefined,
    hasta: sp.get('hasta') ?? undefined,
  };

  const supabase = await createClient();

  // Mapeo slug → id
  const { data: posadas } = await supabase.from('posadas').select('id, slug, nombre');
  const idPorSlug = Object.fromEntries((posadas ?? []).map((p) => [p.slug as string, { id: p.id as string, nombre: p.nombre as string }]));

  // Query base (RLS filtra por rol; excluye eliminadas)
  let q = supabase
    .from('reservas')
    .select(
      'id, fecha_inicio, fecha_fin, estado, modalidad, total_usd, cliente_nombre, num_personas, posadas(nombre), apartamentos(nombre)',
    )
    .is('eliminada_at', null)
    .order('fecha_inicio', { ascending: false })
    .limit(1000);

  if (filtros.estado) q = q.eq('estado', filtros.estado);
  if (filtros.posada && idPorSlug[filtros.posada]) {
    q = q.eq('posada_id', idPorSlug[filtros.posada].id);
  }
  if (filtros.desde) q = q.gte('fecha_inicio', filtros.desde);
  if (filtros.hasta) q = q.lte('fecha_fin', filtros.hasta);

  const { data: reservas, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convertir a forma del PDF
  const datos: ReservaPdf[] = (reservas ?? []).map((r) => {
    const posada = Array.isArray(r.posadas) ? r.posadas[0] : r.posadas;
    const apto = Array.isArray(r.apartamentos) ? r.apartamentos[0] : r.apartamentos;
    return {
      id: r.id as string,
      fecha_inicio: r.fecha_inicio as string,
      fecha_fin: r.fecha_fin as string,
      cliente_nombre: r.cliente_nombre as string,
      posada_nombre: (posada as { nombre: string } | null)?.nombre ?? '—',
      apartamento_nombre: (apto as { nombre: string } | null)?.nombre ?? null,
      modalidad: r.modalidad as 'apartamento' | 'completa',
      num_personas: r.num_personas as number,
      estado: r.estado as 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada',
      total_usd: Number(r.total_usd),
    };
  });

  // Generar fecha legible
  const ahora = new Date();
  const generadoEn = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()} ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

  // Renderizar PDF a Buffer
  const buffer = await renderToBuffer(
    ReporteReservasDoc({ reservas: datos, filtros, generadoEn }),
  );

  // Nombre del archivo
  const sufijo = [filtros.posada, filtros.estado, filtros.desde, filtros.hasta].filter(Boolean).join('-');
  const nombre = `reservas-posadas-san-andres-${fechaParaArchivo()}${sufijo ? '-' + sufijo : ''}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  });
}
