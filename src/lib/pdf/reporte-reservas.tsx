// =====================================================================
// Documento PDF: Reporte de reservas
// =====================================================================
// Genera un PDF con métricas, tabla de reservas y branding.
// =====================================================================

import { Document, Page, Text, View } from '@react-pdf/renderer';
import { estilos, COLOR, fechaLegible } from './estilos';

export interface ReservaPdf {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  cliente_nombre: string;
  posada_nombre: string;
  apartamento_nombre: string | null;
  modalidad: 'apartamento' | 'completa';
  num_personas: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';
  total_usd: number;
}

export interface ReporteReservasProps {
  reservas: ReservaPdf[];
  filtros: {
    posada?: string;
    estado?: string;
    desde?: string;
    hasta?: string;
  };
  generadoEn: string; // "DD/MM/YYYY HH:MM"
}

function formatoUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function tituloFiltros(f: ReporteReservasProps['filtros']): string {
  const partes: string[] = [];
  if (f.posada) partes.push(`Posada: ${f.posada === 'confort' ? 'San Andrés Confort' : 'San Andrés Beach'}`);
  if (f.estado) partes.push(`Estado: ${f.estado}`);
  if (f.desde || f.hasta) {
    const rango = `${f.desde ? fechaLegible(f.desde) : '—'} al ${f.hasta ? fechaLegible(f.hasta) : '—'}`;
    partes.push(`Periodo: ${rango}`);
  }
  return partes.length > 0 ? partes.join(' · ') : 'Todas las reservas';
}

function badgeEstado(estado: string) {
  switch (estado) {
    case 'pendiente': return { etiq: 'Pendiente', style: estilos.badgePendiente };
    case 'confirmada': return { etiq: 'Confirmada', style: estilos.badgeConfirmada };
    case 'rechazada': return { etiq: 'Rechazada', style: estilos.badgeRechazada };
    case 'cancelada': return { etiq: 'Cancelada', style: estilos.badgeCancelada };
    default: return { etiq: estado, style: estilos.badgeCancelada };
  }
}

// Anchos de columna (proporción)
const COL_W = {
  num: 18,
  fechas: 90,
  cliente: 110,
  posada: 80,
  modalidad: 65,
  pers: 35,
  estado: 55,
  total: 60,
} as const;

export function ReporteReservasDoc({ reservas, filtros, generadoEn }: ReporteReservasProps) {
  const totalReservas = reservas.length;
  const confirmadas = reservas.filter((r) => r.estado === 'confirmada');
  const pendientes = reservas.filter((r) => r.estado === 'pendiente');
  const ingresoTotal = confirmadas.reduce((s, r) => s + Number(r.total_usd), 0);
  const ingresoPendiente = pendientes.reduce((s, r) => s + Number(r.total_usd), 0);

  return (
    <Document
      title={`Reporte de reservas — Posadas San Andrés (${generadoEn})`}
      author="Posadas San Andrés"
      creator="Sistema de gestión Posadas San Andrés"
    >
      <Page size="A4" orientation="landscape" style={estilos.page}>
        {/* Header con branding */}
        <View style={estilos.header}>
          <View style={estilos.brand}>
            <View style={estilos.logoBox}>
              <Text style={estilos.logoText}>≋</Text>
            </View>
            <View style={estilos.brandName}>
              <Text style={estilos.brandNamePrimary}>Posadas</Text>
              <Text style={estilos.brandNameAccent}> San Andrés</Text>
            </View>
          </View>
          <View style={estilos.headerMeta}>
            <Text style={estilos.headerMetaLabel}>Generado</Text>
            <Text style={estilos.headerMetaValue}>{generadoEn}</Text>
          </View>
        </View>

        {/* Título */}
        <Text style={estilos.title}>Reporte de reservas</Text>
        <Text style={estilos.subtitle}>{tituloFiltros(filtros)}</Text>

        {/* Métricas resumen */}
        <View style={estilos.metrics}>
          <View style={estilos.metric}>
            <Text style={estilos.metricLabel}>Total reservas</Text>
            <Text style={estilos.metricValue}>{totalReservas}</Text>
            <Text style={estilos.metricSub}>en este reporte</Text>
          </View>
          <View style={estilos.metric}>
            <Text style={estilos.metricLabel}>Confirmadas</Text>
            <Text style={[estilos.metricValue, { color: COLOR.success }]}>{confirmadas.length}</Text>
            <Text style={estilos.metricSub}>fechas bloqueadas</Text>
          </View>
          <View style={estilos.metric}>
            <Text style={estilos.metricLabel}>Pendientes</Text>
            <Text style={[estilos.metricValue, { color: COLOR.warning }]}>{pendientes.length}</Text>
            <Text style={estilos.metricSub}>esperan verificación</Text>
          </View>
          <View style={estilos.metric}>
            <Text style={estilos.metricLabel}>Ingreso confirmado</Text>
            <Text style={estilos.metricValue}>{formatoUSD(ingresoTotal)}</Text>
            <Text style={estilos.metricSub}>USD</Text>
          </View>
          <View style={estilos.metric}>
            <Text style={estilos.metricLabel}>Ingreso pendiente</Text>
            <Text style={[estilos.metricValue, { color: COLOR.warning }]}>{formatoUSD(ingresoPendiente)}</Text>
            <Text style={estilos.metricSub}>USD por confirmar</Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={estilos.section}>
          <Text style={estilos.sectionTitle}>Detalle</Text>
          <View style={estilos.table}>
            <View style={estilos.tableHeader}>
              <Text style={[estilos.tableHeaderCell, { width: COL_W.num }]}>#</Text>
              <Text style={[estilos.tableHeaderCell, { width: COL_W.fechas }]}>Llegada → Salida</Text>
              <Text style={[estilos.tableHeaderCell, { width: COL_W.cliente }]}>Cliente</Text>
              <Text style={[estilos.tableHeaderCell, { width: COL_W.posada }]}>Posada</Text>
              <Text style={[estilos.tableHeaderCell, { width: COL_W.modalidad }]}>Modalidad</Text>
              <Text style={[estilos.tableHeaderCell, { width: COL_W.pers, textAlign: 'center' }]}>Pers</Text>
              <Text style={[estilos.tableHeaderCell, { width: COL_W.estado }]}>Estado</Text>
              <Text style={[estilos.tableHeaderCell, { width: COL_W.total, textAlign: 'right' }]}>Total</Text>
            </View>

            {reservas.length === 0 && (
              <View style={[estilos.tableRow, { justifyContent: 'center' }]}>
                <Text style={[estilos.tableCell, { color: COLOR.foregroundSubtle, fontStyle: 'italic' }]}>
                  Sin reservas para los filtros seleccionados.
                </Text>
              </View>
            )}

            {reservas.map((r, i) => {
              const b = badgeEstado(r.estado);
              const modalidadTxt = r.modalidad === 'completa'
                ? 'Completa'
                : `Apto ${r.apartamento_nombre ?? ''}`;
              return (
                <View key={r.id} style={[estilos.tableRow, ...(i % 2 === 1 ? [estilos.tableRowAlt] : [])]}>
                  <Text style={[estilos.tableCell, { width: COL_W.num, color: COLOR.foregroundSubtle }]}>{i + 1}</Text>
                  <Text style={[estilos.tableCell, { width: COL_W.fechas }]}>
                    {fechaLegible(r.fecha_inicio)} → {fechaLegible(r.fecha_fin)}
                  </Text>
                  <Text style={[estilos.tableCell, { width: COL_W.cliente, fontWeight: 600 }]}>{r.cliente_nombre}</Text>
                  <Text style={[estilos.tableCell, { width: COL_W.posada }]}>{r.posada_nombre}</Text>
                  <Text style={[estilos.tableCell, { width: COL_W.modalidad }]}>{modalidadTxt}</Text>
                  <Text style={[estilos.tableCell, { width: COL_W.pers, textAlign: 'center' }]}>{r.num_personas}</Text>
                  <View style={{ width: COL_W.estado }}>
                    <Text style={[estilos.badge, b.style]}>{b.etiq}</Text>
                  </View>
                  <Text style={[estilos.tableCell, { width: COL_W.total, textAlign: 'right', fontWeight: 600 }]}>
                    {formatoUSD(Number(r.total_usd))}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={estilos.footer} fixed>
          <Text style={estilos.footerText}>
            Posadas San Andrés · Chichiriviche, Falcón, Venezuela
          </Text>
          <Text
            style={estilos.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
