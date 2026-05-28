import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import { formatoFechaCorta, formatoFechaLarga, formatoUSD } from '@/lib/formato';
import { AccionesReserva } from '@/components/acciones-reserva';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Detalle de reserva' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservaDetallePage({ params }: PageProps) {
  const { id } = await params;
  const sesion = await getSesionAdminEstricto();
  const supabase = await createClient();

  // RLS filtra por rol; si el usuario no debe verla, .single() falla
  const { data: r, error } = await supabase
    .from('reservas')
    .select(
      `id, posada_id, fecha_inicio, fecha_fin, estado, modalidad, total_usd, desglose_precio,
       cliente_nombre, cliente_telefono, cliente_email, num_personas, notas,
       gestor_id, comprobante_pago_url, motivo_rechazo,
       created_at, confirmada_at, cancelada_at,
       posadas(slug, nombre), apartamentos(nombre),
       gestor:usuarios!reservas_gestor_id_fkey(nombre, rol)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !r) notFound();

  const posada = pickFirst<{ slug: string; nombre: string }>(r.posadas);
  const apto = pickFirst<{ nombre: string }>(r.apartamentos);
  const gestor = pickFirst<{ nombre: string; rol: string }>(r.gestor);

  // URL firmada del comprobante (válida 1 hora — tiempo suficiente para revisarlo)
  let comprobanteUrl: string | null = null;
  if (r.comprobante_pago_url) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from('comprobantes-pago')
      .createSignedUrl(r.comprobante_pago_url as string, 60 * 60);
    comprobanteUrl = signed?.signedUrl ?? null;
  }

  // ¿Este usuario puede tomar acciones (confirmar/rechazar)?
  const puedeAccionar =
    (r.estado === 'pendiente') &&
    (sesion.perfil.rol === 'dueno' ||
      (sesion.perfil.rol === 'vulcanos' && r.gestor_id === sesion.user_id));

  // Vulcanos puede "tomar" una reserva pendiente sin gestor para luego confirmarla
  const puedeTomarVulcanos =
    sesion.perfil.rol === 'vulcanos' &&
    r.estado === 'pendiente' &&
    r.gestor_id === null;

  return (
    <div>
      <Link
        href="/admin/reservas"
        className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:text-[var(--primary-soft)] mb-4"
      >
        <span aria-hidden>←</span> Volver al listado
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">
            Reserva #{(r.id as string).slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-[var(--muted)] text-sm">
            Solicitada el {formatoFechaLarga((r.created_at as string).slice(0, 10))}
          </p>
        </div>
        <BadgeEstadoGrande estado={r.estado as string} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Columna principal */}
        <div className="space-y-4">
          {/* Cliente */}
          <Bloque titulo="Cliente">
            <Linea k="Nombre" v={r.cliente_nombre as string} />
            <Linea k="Teléfono" v={r.cliente_telefono as string} />
            <Linea k="Email" v={r.cliente_email as string} />
            {r.notas && <Linea k="Notas" v={r.notas as string} />}
          </Bloque>

          {/* Reserva */}
          <Bloque titulo="Detalle de la reserva">
            <Linea k="Posada" v={posada?.nombre ?? '—'} />
            <Linea
              k="Modalidad"
              v={r.modalidad === 'completa' ? 'Posada completa' : `Apartamento ${apto?.nombre ?? ''}`}
            />
            <Linea k="Llegada" v={formatoFechaLarga(r.fecha_inicio as string)} />
            <Linea k="Salida" v={formatoFechaLarga(r.fecha_fin as string)} />
            <Linea k="Personas" v={String(r.num_personas)} />
            <Linea k="Gestor" v={gestor ? `${gestor.nombre} (${gestor.rol})` : '— (directo del Dueño)'} />
            {r.confirmada_at && (
              <Linea k="Confirmada el" v={formatoFechaLarga((r.confirmada_at as string).slice(0, 10))} />
            )}
            {r.motivo_rechazo && (
              <Linea k="Motivo de rechazo" v={r.motivo_rechazo as string} />
            )}
          </Bloque>

          {/* Desglose */}
          {r.desglose_precio && (
            <Bloque titulo="Desglose de precio">
              <DesglosePrecio data={r.desglose_precio as unknown as { noches?: Array<{ fecha: string; temporada_nombre: string; precio_usd: number }>; temporadas_aplicadas?: Array<{ nombre: string; cantidad_noches: number }> }} />
            </Bloque>
          )}
        </div>

        {/* Sidebar: total, comprobante, acciones */}
        <aside className="space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Total</p>
            <p className="text-3xl font-bold text-[var(--primary)]">
              {formatoUSD(Number(r.total_usd))}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">USD</p>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <p className="font-semibold mb-2">Comprobante de pago</p>
            {comprobanteUrl ? (
              <a
                href={comprobanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-[var(--primary)] hover:bg-[var(--primary-soft)] text-white font-medium py-2 rounded-md transition-colors"
              >
                📎 Ver comprobante
              </a>
            ) : (
              <p className="text-sm text-red-700">⚠ Sin comprobante subido.</p>
            )}
            <p className="text-xs text-[var(--muted)] mt-2">El link se abre en otra pestaña. Válido 1 hora.</p>
          </div>

          {/* Acciones (confirmar/rechazar/tomar) */}
          <AccionesReserva
            reservaId={r.id as string}
            rol={sesion.perfil.rol}
            puedeAccionar={puedeAccionar}
            puedeTomar={puedeTomarVulcanos}
          />
        </aside>
      </div>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <h2 className="font-semibold text-lg mb-3">{titulo}</h2>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Linea({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--muted)] shrink-0">{k}</span>
      <span className="text-right break-words">{v}</span>
    </div>
  );
}

function BadgeEstadoGrande({ estado }: { estado: string }) {
  const config: Record<string, { etiq: string; clases: string }> = {
    pendiente: { etiq: '⏳ Pendiente', clases: 'bg-amber-100 text-amber-800 border-amber-300' },
    confirmada: { etiq: '✓ Confirmada', clases: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    rechazada: { etiq: '✗ Rechazada', clases: 'bg-red-100 text-red-800 border-red-300' },
    cancelada: { etiq: '🚫 Cancelada', clases: 'bg-gray-100 text-gray-700 border-gray-300' },
  };
  const c = config[estado] ?? { etiq: estado, clases: 'bg-gray-100' };
  return (
    <span className={`inline-block px-3 py-1.5 rounded-md text-sm font-medium border ${c.clases}`}>
      {c.etiq}
    </span>
  );
}

function DesglosePrecio({ data }: { data: { noches?: Array<{ fecha: string; temporada_nombre: string; precio_usd: number }>; temporadas_aplicadas?: Array<{ nombre: string; cantidad_noches: number }> } }) {
  if (!data?.temporadas_aplicadas) return <p className="text-sm text-[var(--muted)]">Sin desglose.</p>;
  return (
    <div className="space-y-2 text-sm">
      {data.temporadas_aplicadas.map((t, i) => (
        <div key={i} className="flex justify-between">
          <span>{t.nombre}</span>
          <span>{t.cantidad_noches} {t.cantidad_noches === 1 ? 'noche' : 'noches'}</span>
        </div>
      ))}
      {data.noches && data.noches.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]">
            Ver noche por noche
          </summary>
          <table className="w-full mt-2 text-xs">
            <tbody>
              {data.noches.map((n, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="py-1">{formatoFechaCorta(n.fecha)}</td>
                  <td className="py-1 text-[var(--muted)]">{n.temporada_nombre}</td>
                  <td className="py-1 text-right">{formatoUSD(n.precio_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function pickFirst<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}
