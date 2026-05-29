// =====================================================================
// Route handler: descarga CSV de movimientos del mes
// =====================================================================
// GET /admin/reportes/exportar?mes=YYYY-MM
// Devuelve un CSV con columnas: fecha, tipo, concepto, posada, monto_in,
// monto_out, notas — formato útil para conciliación contable.
// =====================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exigirRol } from '@/lib/auth/session';

interface Movimiento {
  fecha: string;
  tipo: 'ingreso' | 'gasto' | 'comision' | 'nomina';
  concepto: string;
  posada: string;
  monto_in: number;
  monto_out: number;
  notas: string;
}

function escaparCSV(v: string | number | null | undefined): string {
  const s = String(v ?? '');
  if (/[,;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  await exigirRol(['dueno', 'contador']);

  const mes = request.nextUrl.searchParams.get('mes');
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: 'Parámetro mes inválido (formato YYYY-MM).' }, { status: 400 });
  }
  const [anyo, mesNum] = mes.split('-').map(Number);
  const primerDia = `${mes}-01`;
  const ultimoDia = new Date(anyo, mesNum, 0).toISOString().slice(0, 10);

  const supabase = await createClient();
  const [pagosRes, gastosRes, comisionesRes, nominaRes] = await Promise.all([
    supabase
      .from('pagos')
      .select('fecha_pago, monto_bruto_usd, comision_retenida_usd, monto_neto_usd, canal, notas, reservas(cliente_nombre, posadas(nombre))')
      .gte('fecha_pago', primerDia)
      .lte('fecha_pago', ultimoDia)
      .order('fecha_pago'),
    supabase
      .from('gastos')
      .select('fecha, monto_usd, categoria, descripcion, posadas(nombre)')
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia)
      .order('fecha'),
    supabase
      .from('comisiones')
      .select('fecha_pago, monto_usd, usuarios!comisiones_beneficiario_id_fkey(nombre), reservas(posadas(nombre))')
      .eq('estado', 'pagada')
      .gte('fecha_pago', primerDia)
      .lte('fecha_pago', ultimoDia)
      .order('fecha_pago'),
    supabase
      .from('nomina')
      .select('fecha_pago, monto_usd, concepto, usuarios(nombre), posadas(nombre)')
      .eq('estado', 'pagada')
      .gte('fecha_pago', primerDia)
      .lte('fecha_pago', ultimoDia)
      .order('fecha_pago'),
  ]);

  const movs: Movimiento[] = [];

  function pickFirst<T>(v: unknown): T | null {
    if (Array.isArray(v)) return (v[0] as T) ?? null;
    return (v as T) ?? null;
  }

  for (const p of pagosRes.data ?? []) {
    const reserva = pickFirst<{ cliente_nombre: string; posadas: unknown }>(p.reservas);
    const posada = reserva ? pickFirst<{ nombre: string }>(reserva.posadas) : null;
    movs.push({
      fecha: p.fecha_pago as string,
      tipo: 'ingreso',
      concepto: `Pago ${p.canal} de ${reserva?.cliente_nombre ?? '—'}`,
      posada: posada?.nombre ?? '—',
      monto_in: Number(p.monto_neto_usd),
      monto_out: 0,
      notas: (p.notas as string) ?? '',
    });
  }
  for (const g of gastosRes.data ?? []) {
    const posada = pickFirst<{ nombre: string }>(g.posadas);
    movs.push({
      fecha: g.fecha as string,
      tipo: 'gasto',
      concepto: `${g.categoria}: ${g.descripcion}`,
      posada: posada?.nombre ?? '—',
      monto_in: 0,
      monto_out: Number(g.monto_usd),
      notas: '',
    });
  }
  for (const c of comisionesRes.data ?? []) {
    const ben = pickFirst<{ nombre: string }>(c.usuarios);
    const reserva = pickFirst<{ posadas: unknown }>(c.reservas);
    const posada = reserva ? pickFirst<{ nombre: string }>(reserva.posadas) : null;
    movs.push({
      fecha: c.fecha_pago as string,
      tipo: 'comision',
      concepto: `Comisión 10% a ${ben?.nombre ?? '—'}`,
      posada: posada?.nombre ?? '—',
      monto_in: 0,
      monto_out: Number(c.monto_usd),
      notas: '',
    });
  }
  for (const n of nominaRes.data ?? []) {
    const empleado = pickFirst<{ nombre: string }>(n.usuarios);
    const posada = pickFirst<{ nombre: string }>(n.posadas);
    movs.push({
      fecha: n.fecha_pago as string,
      tipo: 'nomina',
      concepto: `${n.concepto}: ${empleado?.nombre ?? '—'}`,
      posada: posada?.nombre ?? '—',
      monto_in: 0,
      monto_out: Number(n.monto_usd),
      notas: '',
    });
  }

  movs.sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Generar CSV
  const lineas: string[] = ['fecha,tipo,concepto,posada,monto_in_usd,monto_out_usd,notas'];
  for (const m of movs) {
    lineas.push([
      escaparCSV(m.fecha),
      escaparCSV(m.tipo),
      escaparCSV(m.concepto),
      escaparCSV(m.posada),
      escaparCSV(m.monto_in.toFixed(2)),
      escaparCSV(m.monto_out.toFixed(2)),
      escaparCSV(m.notas),
    ].join(','));
  }

  // Totales al final
  const totalIn = movs.reduce((s, m) => s + m.monto_in, 0);
  const totalOut = movs.reduce((s, m) => s + m.monto_out, 0);
  lineas.push('');
  lineas.push(`TOTAL,,,,${totalIn.toFixed(2)},${totalOut.toFixed(2)},Utilidad: ${(totalIn - totalOut).toFixed(2)}`);

  const csv = '﻿' + lineas.join('\r\n');  // BOM para que Excel detecte UTF-8

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="movimientos-${mes}.csv"`,
    },
  });
}
