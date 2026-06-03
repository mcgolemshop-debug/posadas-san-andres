// =====================================================================
// Estilos compartidos para reportes PDF con branding Posadas San Andrés
// =====================================================================
// Reusa la paleta Costa cinematográfica del sitio web.
// Tipografía: Inter para body, fallback default si no hay Fraunces.
// =====================================================================

import { StyleSheet } from '@react-pdf/renderer';

// Usamos las fuentes built-in de @react-pdf:
//   - Helvetica (sans) → para body, equivalente a Inter
//   - Times-Roman (serif) → para títulos, look elegante similar a Fraunces
// Evitamos descargas de Google Fonts que fallan en serverless de Vercel.
const FUENTE_SANS = 'Helvetica';
const FUENTE_SERIF = 'Times-Roman';

// Paleta Costa cinematográfica (sincronizada con globals.css)
export const COLOR = {
  primary: '#0c4a6e',
  primaryHover: '#075985',
  primaryLight: '#e0f2fe',
  secondary: '#06b6d4',
  accent: '#fb7185',
  accentWarm: '#fb923c',
  background: '#fffbf5',
  surface: '#ffffff',
  surfaceElevated: '#fdfaf4',
  border: '#e2d8c5',
  borderSubtle: '#f0e8d9',
  foreground: '#0f172a',
  foregroundMuted: '#475569',
  foregroundSubtle: '#94a3b8',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  successLight: '#d1fae5',
  warningLight: '#fef3c7',
  dangerLight: '#fee2e2',
} as const;

export const estilos = StyleSheet.create({
  page: {
    fontFamily: FUENTE_SANS,
    fontSize: 9,
    padding: 36,
    backgroundColor: COLOR.background,
    color: COLOR.foreground,
  },

  // Header con logo + branding
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLOR.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: 'white',
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
  },
  brandName: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  brandNamePrimary: {
    fontFamily: 'Times-Bold',
    fontSize: 18,
    color: COLOR.primary,
  },
  brandNameAccent: {
    fontFamily: 'Times-Italic',
    fontSize: 18,
    color: COLOR.accent,
  },
  headerMeta: {
    textAlign: 'right',
  },
  headerMetaLabel: {
    fontSize: 7,
    color: COLOR.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerMetaValue: {
    fontSize: 9,
    color: COLOR.foregroundMuted,
    marginTop: 2,
  },

  // Título y subtítulo del reporte
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 24,
    color: COLOR.foreground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: COLOR.foregroundMuted,
    marginBottom: 18,
  },

  // Sección con título
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    color: COLOR.foreground,
    marginBottom: 8,
  },

  // Caja métrica
  metrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  metric: {
    flex: 1,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: 8,
    padding: 10,
  },
  metricLabel: {
    fontSize: 7,
    color: COLOR.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: 'Times-Bold',
    fontSize: 18,
    color: COLOR.primary,
  },
  metricSub: {
    fontSize: 7,
    color: COLOR.foregroundSubtle,
    marginTop: 2,
  },

  // Tabla
  table: {
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLOR.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: COLOR.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.borderSubtle,
  },
  tableRowAlt: {
    backgroundColor: COLOR.surfaceElevated + '60',
  },
  tableCell: {
    fontSize: 8,
    color: COLOR.foreground,
  },

  // Badges de estado
  badge: {
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    fontSize: 7,
  },
  badgePendiente: {
    backgroundColor: COLOR.warningLight,
    color: COLOR.warning,
  },
  badgeConfirmada: {
    backgroundColor: COLOR.successLight,
    color: COLOR.success,
  },
  badgeRechazada: {
    backgroundColor: COLOR.dangerLight,
    color: COLOR.danger,
  },
  badgeCancelada: {
    backgroundColor: '#f1f5f9',
    color: COLOR.foregroundMuted,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLOR.border,
  },
  footerText: {
    fontSize: 7,
    color: COLOR.foregroundSubtle,
  },
});

export const fechaParaArchivo = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fechaLegible = (iso: string): string => {
  if (!iso) return '';
  const [a, m, dia] = iso.split('-');
  return `${dia}/${m}/${a}`;
};
