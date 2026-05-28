import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Solicitud enviada' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservaEnviadaPage({ params }: PageProps) {
  const { id } = await params;

  // Usamos admin para garantizar que el cliente puede ver su propia reserva
  // recién creada (anon no tiene policy SELECT en reservas).
  // En producción haríamos un token único por reserva en la URL; por simplicidad
  // ahora confiamos en que el UUID es opaco.
  const supabase = createAdminClient();
  const { data: reserva, error } = await supabase
    .from('reservas')
    .select(
      'id, fecha_inicio, fecha_fin, num_personas, modalidad, total_usd, estado, cliente_nombre, cliente_email, posadas(nombre, slug), apartamentos(nombre)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !reserva) notFound();

  const posada = Array.isArray(reserva.posadas) ? reserva.posadas[0] : reserva.posadas;
  const apto = Array.isArray(reserva.apartamentos) ? reserva.apartamentos[0] : reserva.apartamentos;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 text-3xl mb-4">
          ✓
        </div>
        <h1 className="text-3xl font-semibold mb-2">¡Solicitud recibida!</h1>
        <p className="text-[var(--muted)]">
          Hola {reserva.cliente_nombre}, recibimos tu solicitud para{' '}
          {posada?.nombre ?? 'la posada'}.
        </p>
      </div>

      {/* Resumen */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-3">
        <h2 className="font-semibold text-lg mb-3">Resumen de tu solicitud</h2>
        <Linea k="Número de solicitud" v={reserva.id.slice(0, 8).toUpperCase()} />
        <Linea k="Posada" v={posada?.nombre ?? '—'} />
        <Linea
          k="Modalidad"
          v={
            reserva.modalidad === 'completa'
              ? 'Posada completa'
              : `Apartamento ${apto?.nombre ?? ''}`
          }
        />
        <Linea k="Llegada" v={formatoFechaCorta(reserva.fecha_inicio)} />
        <Linea k="Salida" v={formatoFechaCorta(reserva.fecha_fin)} />
        <Linea k="Personas" v={String(reserva.num_personas)} />
        <Linea k="Total" v={formatoUSD(Number(reserva.total_usd))} resaltar />
        <Linea k="Estado" v="⏳ Pendiente de confirmación" />
      </div>

      {/* Datos de pago — PLACEHOLDER mientras Orlando los confirma */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          💸 Cómo verificar tu pago
        </h2>
        <p className="text-sm text-amber-900 mb-3">
          Recibimos tu comprobante. Vamos a verificarlo y te confirmaremos por
          WhatsApp y email <strong>{reserva.cliente_email}</strong> en las próximas
          horas. Mientras tanto, guarda tu número de solicitud por si necesitas
          contactarnos.
        </p>
        <p className="text-xs text-amber-800 italic">
          Datos bancarios y canales de pago próximamente publicados aquí.
        </p>
      </div>

      <div className="text-center">
        <Link
          href="/"
          className="inline-block text-[var(--primary)] hover:text-[var(--primary-soft)] font-medium"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function Linea({ k, v, resaltar }: { k: string; v: string; resaltar?: boolean }) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <span className="text-[var(--muted)]">{k}</span>
      <span className={resaltar ? 'text-xl font-semibold text-[var(--primary)]' : ''}>
        {v}
      </span>
    </div>
  );
}
