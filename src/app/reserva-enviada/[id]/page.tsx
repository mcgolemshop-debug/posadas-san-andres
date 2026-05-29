import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CheckCircle2,
  Mail,
  Wallet,
  ArrowRight,
  Calendar,
  Users,
  Home,
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Solicitud enviada' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservaEnviadaPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = createAdminClient();
  const { data: reserva, error } = await supabase
    .from('reservas')
    .select(
      'id, fecha_inicio, fecha_fin, num_personas, modalidad, total_usd, estado, cliente_nombre, cliente_email, posadas(nombre, slug), apartamentos(nombre)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !reserva) notFound();

  const posada = pickFirst<{ nombre: string; slug: string }>(reserva.posadas);
  const apto = pickFirst<{ nombre: string }>(reserva.apartamentos);
  const codigoCorto = reserva.id.slice(0, 8).toUpperCase();

  return (
    <div className="bg-[var(--background)] min-h-screen py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {/* Cabecera celebratoria */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-xl">
              <CheckCircle2 className="w-10 h-10" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl mb-3 text-[var(--foreground)]">
            ¡Solicitud recibida!
          </h1>
          <p className="text-[var(--foreground-muted)] text-lg leading-relaxed">
            Hola <strong className="text-[var(--foreground)]">{reserva.cliente_nombre}</strong>,<br className="sm:hidden" />
            recibimos tu solicitud para <strong>{posada?.nombre}</strong>.
          </p>
        </div>

        {/* Tarjeta de número de reserva */}
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white rounded-2xl p-6 mb-6 text-center shadow-xl">
          <p className="text-xs uppercase tracking-widest text-white/70 mb-1">Número de solicitud</p>
          <p className="font-display text-4xl tracking-widest">{codigoCorto}</p>
          <p className="text-xs text-white/60 mt-1">Guárdalo por si necesitas contactarnos</p>
        </div>

        {/* Tarjeta resumen */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-md overflow-hidden mb-6">
          <div className="p-6 sm:p-7">
            <h2 className="font-display text-2xl mb-5 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--primary)]" />
              Resumen
            </h2>
            <div className="space-y-3">
              <Linea
                icono={<Home className="w-4 h-4" />}
                k="Posada"
                v={posada?.nombre ?? '—'}
              />
              <Linea
                icono={<Home className="w-4 h-4" />}
                k="Modalidad"
                v={reserva.modalidad === 'completa' ? 'Posada completa' : `Apartamento ${apto?.nombre ?? ''}`}
              />
              <Linea
                icono={<Calendar className="w-4 h-4" />}
                k="Llegada"
                v={`${formatoFechaCorta(reserva.fecha_inicio)} · 2:00 PM`}
              />
              <Linea
                icono={<Calendar className="w-4 h-4" />}
                k="Salida"
                v={`${formatoFechaCorta(reserva.fecha_fin)} · 12:00 m`}
              />
              <Linea
                icono={<Users className="w-4 h-4" />}
                k="Personas"
                v={String(reserva.num_personas)}
              />
            </div>
          </div>
          {/* Total destacado */}
          <div className="bg-[var(--primary-light)] border-t border-[var(--border-subtle)] px-6 sm:px-7 py-4 flex justify-between items-baseline">
            <span className="font-semibold text-[var(--primary)]">Total</span>
            <span className="font-display text-3xl text-[var(--primary)]">
              {formatoUSD(Number(reserva.total_usd))}
            </span>
          </div>
          {/* Estado */}
          <div className="border-t border-[var(--border-subtle)] px-6 sm:px-7 py-3 flex items-center gap-2 text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
            <span className="text-[var(--warning)] font-medium">Pendiente de confirmación</span>
          </div>
        </div>

        {/* Próximos pasos */}
        <div className="bg-gradient-to-br from-[var(--accent-light)] to-[var(--warning-light)] border border-[var(--accent)]/30 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <Wallet className="w-6 h-6 text-[var(--accent-hover)] mt-0.5 shrink-0" />
            <div>
              <h3 className="font-display text-xl mb-2">¿Qué sigue?</h3>
              <p className="text-[var(--foreground)] mb-2">
                <Mail className="inline w-4 h-4 mr-1 text-[var(--accent-hover)]" />
                Recibimos tu comprobante. Lo verificaremos y te contactaremos por{' '}
                <strong>WhatsApp</strong> y al email{' '}
                <strong>{reserva.cliente_email}</strong> en las próximas horas.
              </p>
              <p className="text-xs text-[var(--foreground-muted)] italic mt-3">
                Datos bancarios y canales de pago detallados próximamente publicados aquí.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function Linea({ icono, k, v }: { icono: React.ReactNode; k: string; v: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-8 h-8 rounded-lg bg-[var(--background)] text-[var(--foreground-muted)] flex items-center justify-center shrink-0">
        {icono}
      </span>
      <span className="text-[var(--foreground-muted)] flex-1">{k}</span>
      <span className="font-medium text-[var(--foreground)] text-right">{v}</span>
    </div>
  );
}

function pickFirst<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}
