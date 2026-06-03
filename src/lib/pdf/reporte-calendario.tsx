// =====================================================================
// Documento PDF: Calendario de ocupación mensual
// =====================================================================
// Genera un PDF con vista mensual por posada (Confort: 4 aptos × días;
// Beach: 1 fila × días). Celdas ocupadas en color con nombre del cliente.
// =====================================================================

import { Document, Page, Text, View } from '@react-pdf/renderer';
import { estilos, COLOR } from './estilos';

export interface ReservaCalendarPdf {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  cliente_nombre: string;
  modalidad: 'apartamento' | 'completa';
  apartamento_id: string | null;
  apartamentos_ids: string[] | null;
}

export interface FilaCalendar {
  id: string;
  nombre: string;
}

export interface PosadaCalendar {
  slug: 'confort' | 'beach';
  nombre: string;
  filas: FilaCalendar[];
  reservas: ReservaCalendarPdf[];
}

export interface ReporteCalendarioProps {
  /** YYYY-MM */
  mes: string;
  posadas: PosadaCalendar[];
  generadoEn: string;
}

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const INICIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Paleta de colores por reserva (hash → uno de 6)
function colorPara(id: string): string {
  const palette = [COLOR.success, COLOR.secondary, '#8b5cf6', COLOR.accent, COLOR.accentWarm, '#0891b2'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function ReporteCalendarioDoc({ mes, posadas, generadoEn }: ReporteCalendarioProps) {
  const [anyo, mesNum] = mes.split('-').map(Number);
  const diasEnMes = new Date(anyo, mesNum, 0).getDate();
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);
  const nombreMes = `${MESES_ES[mesNum - 1]} ${anyo}`;

  const calcDiaSemana = (dia: number) => new Date(anyo, mesNum - 1, dia).getDay();

  // Construir cobertura por posada
  function construirCobertura(p: PosadaCalendar): Map<string, ReservaCalendarPdf> {
    const cobertura = new Map<string, ReservaCalendarPdf>();
    for (const r of p.reservas) {
      const inicio = new Date(r.fecha_inicio + 'T12:00:00Z');
      const fin = new Date(r.fecha_fin + 'T12:00:00Z');
      for (let d = 1; d <= diasEnMes; d++) {
        const f = new Date(anyo, mesNum - 1, d, 12, 0, 0);
        if (f >= inicio && f < fin) {
          if (p.slug === 'beach' || r.modalidad === 'completa') {
            for (const fila of p.filas) cobertura.set(`${fila.id}:${d}`, r);
          } else {
            const susAptos = (r.apartamentos_ids && r.apartamentos_ids.length > 0)
              ? r.apartamentos_ids
              : (r.apartamento_id ? [r.apartamento_id] : []);
            for (const aid of susAptos) cobertura.set(`${aid}:${d}`, r);
          }
        }
      }
    }
    return cobertura;
  }

  return (
    <Document
      title={`Calendario de ocupación — Posadas San Andrés (${nombreMes})`}
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

        <Text style={estilos.title}>Calendario de ocupación</Text>
        <Text style={estilos.subtitle}>{nombreMes}</Text>

        {/* Leyenda */}
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: COLOR.success, borderRadius: 2 }} />
            <Text style={{ fontSize: 8, color: COLOR.foregroundMuted }}>Reservado / ocupado</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: 'white', borderWidth: 0.5, borderColor: COLOR.border, borderRadius: 2 }} />
            <Text style={{ fontSize: 8, color: COLOR.foregroundMuted }}>Disponible</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: COLOR.primaryLight, borderWidth: 0.5, borderColor: COLOR.primary, borderRadius: 2 }} />
            <Text style={{ fontSize: 8, color: COLOR.foregroundMuted }}>Fin de semana</Text>
          </View>
        </View>

        {/* Tabla por posada */}
        {posadas.map((p) => {
          const cobertura = construirCobertura(p);
          const labelWidth = 80;
          const dayWidth = (760 - labelWidth) / diasEnMes;

          return (
            <View key={p.slug} style={{ marginBottom: 20 }} wrap={false}>
              <Text style={estilos.sectionTitle}>{p.nombre}</Text>

              <View style={{ borderWidth: 0.5, borderColor: COLOR.border, borderRadius: 4 }}>
                {/* Fila 1: día de semana */}
                <View style={{ flexDirection: 'row', backgroundColor: COLOR.surfaceElevated, borderBottomWidth: 0.5, borderBottomColor: COLOR.borderSubtle }}>
                  <View style={{ width: labelWidth, padding: 4 }}>
                    <Text style={{ fontSize: 6, color: COLOR.foregroundSubtle, textTransform: 'uppercase' }}>Apartamento</Text>
                  </View>
                  {dias.map((d) => {
                    const ds = calcDiaSemana(d);
                    const esFinde = ds === 0 || ds === 6;
                    return (
                      <View
                        key={`dow-${d}`}
                        style={{
                          width: dayWidth,
                          paddingVertical: 2,
                          alignItems: 'center',
                          backgroundColor: esFinde ? COLOR.primaryLight : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: esFinde ? COLOR.primary : COLOR.foregroundSubtle }}>
                          {INICIALES[ds]}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Fila 2: número de día */}
                <View style={{ flexDirection: 'row', backgroundColor: COLOR.surfaceElevated, borderBottomWidth: 1, borderBottomColor: COLOR.border }}>
                  <View style={{ width: labelWidth, padding: 2 }} />
                  {dias.map((d) => {
                    const ds = calcDiaSemana(d);
                    const esFinde = ds === 0 || ds === 6;
                    return (
                      <View
                        key={`dn-${d}`}
                        style={{
                          width: dayWidth,
                          paddingVertical: 2,
                          alignItems: 'center',
                          backgroundColor: esFinde ? COLOR.primaryLight : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: esFinde ? COLOR.primary : COLOR.foreground }}>
                          {d}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Filas de apartamentos */}
                {p.filas.map((fila, fi) => (
                  <View
                    key={fila.id}
                    style={{
                      flexDirection: 'row',
                      backgroundColor: fi % 2 === 0 ? 'white' : COLOR.surfaceElevated + '40',
                      borderBottomWidth: 0.3,
                      borderBottomColor: COLOR.borderSubtle,
                    }}
                  >
                    <View style={{ width: labelWidth, padding: 6, justifyContent: 'center', borderRightWidth: 0.5, borderRightColor: COLOR.borderSubtle }}>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{fila.nombre}</Text>
                    </View>
                    {dias.map((d) => {
                      const r = cobertura.get(`${fila.id}:${d}`);
                      const ds = calcDiaSemana(d);
                      const esFinde = ds === 0 || ds === 6;
                      if (!r) {
                        return (
                          <View
                            key={d}
                            style={{
                              width: dayWidth,
                              height: 18,
                              backgroundColor: esFinde ? COLOR.primaryLight + '40' : 'transparent',
                              borderRightWidth: 0.2,
                              borderRightColor: COLOR.borderSubtle,
                            }}
                          />
                        );
                      }
                      const inicioMes = `${anyo}-${String(mesNum).padStart(2, '0')}-01`;
                      const primerDia = d === Number(r.fecha_inicio.slice(8, 10)) ||
                        (d === 1 && r.fecha_inicio < inicioMes);
                      const bg = colorPara(r.id);
                      return (
                        <View
                          key={d}
                          style={{
                            width: dayWidth,
                            height: 18,
                            backgroundColor: bg,
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            paddingLeft: 2,
                          }}
                        >
                          {primerDia && (
                            <Text style={{ fontSize: 5, color: 'white', fontFamily: 'Helvetica-Bold' }}>
                              {r.cliente_nombre.split(' ')[0].slice(0, 10)}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Lista de reservas del mes — abajo para referencia */}
        {posadas.map((p) =>
          p.reservas.length > 0 ? (
            <View key={`lista-${p.slug}`} style={{ marginTop: 6, marginBottom: 12 }} wrap={false}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.foregroundMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {p.nombre} · Reservas confirmadas
              </Text>
              {p.reservas.map((r) => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <View style={{ width: 6, height: 6, backgroundColor: colorPara(r.id), borderRadius: 1 }} />
                  <Text style={{ fontSize: 7, color: COLOR.foreground }}>
                    {r.fecha_inicio} → {r.fecha_fin} · <Text style={{ fontFamily: 'Helvetica-Bold' }}>{r.cliente_nombre}</Text>
                    {r.modalidad === 'completa' && <Text style={{ color: COLOR.foregroundMuted }}> (posada completa)</Text>}
                  </Text>
                </View>
              ))}
            </View>
          ) : null,
        )}

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
