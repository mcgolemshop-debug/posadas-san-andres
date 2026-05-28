import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Render dinámico porque leemos de Supabase
export const dynamic = 'force-dynamic';

// Generamos metadata por slug
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('posadas')
    .select('nombre, descripcion')
    .eq('slug', slug)
    .single();

  if (!data) return { title: 'Posada no encontrada' };
  return { title: data.nombre, description: data.descripcion ?? undefined };
}

export default async function PosadaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Leemos en paralelo: posada + apartamentos + precios
  const [posadaRes, aptosRes, preciosRes] = await Promise.all([
    supabase
      .from('posadas')
      .select('id, slug, nombre, descripcion, tipo_alquiler, foto_portada, galeria_urls')
      .eq('slug', slug)
      .eq('activa', true)
      .maybeSingle(),
    supabase
      .from('apartamentos')
      .select('id, nombre, caracteristica, capacidad, foto_portada, orden')
      .order('orden'),
    supabase
      .from('precios')
      .select('precio_usd, modalidad, num_personas, temporada_id'),
  ]);

  const posada = posadaRes.data;
  if (!posada) notFound();

  // Filtrar apartamentos de ESTA posada (la tabla ya vino completa pero RLS y simpleza la dejamos así)
  const { data: aptosPosada } = await supabase
    .from('apartamentos')
    .select('id, nombre, caracteristica, capacidad, foto_portada, orden')
    .eq('posada_id', posada.id)
    .eq('activo', true)
    .order('orden');

  const apartamentos = aptosPosada ?? [];
  const preciosPosada = (preciosRes.data ?? []);

  const esConfort = posada.slug === 'confort';
  const esBeach = posada.slug === 'beach';

  // Resumen de precios para el badge "Desde $X / noche"
  const precioMin =
    preciosPosada.length > 0
      ? Math.min(...preciosPosada.map((p) => Number(p.precio_usd)))
      : null;
  const precioMax =
    preciosPosada.length > 0
      ? Math.max(...preciosPosada.map((p) => Number(p.precio_usd)))
      : null;

  return (
    <div>
      {/* Hero */}
      <section
        className={`text-white ${
          esBeach
            ? 'bg-gradient-to-br from-cyan-700 to-blue-900'
            : 'bg-gradient-to-br from-amber-700 to-orange-900'
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-6"
          >
            <span aria-hidden>←</span> Volver
          </Link>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-4">
            {posada.nombre}
          </h1>
          <p className="text-lg sm:text-xl text-white/85 max-w-3xl leading-relaxed">
            {posada.descripcion}
          </p>
          {precioMin && (
            <p className="mt-6 text-white/75 text-sm">
              Desde <span className="text-2xl font-semibold text-white">${precioMin}</span>{' '}
              / noche · hasta ${precioMax} en temporadas altas
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        {/* Galería placeholder */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Galería</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg ${
                  esBeach ? 'bg-cyan-100' : 'bg-amber-100'
                } flex items-center justify-center text-3xl text-[var(--muted)]`}
              >
                {esBeach ? '🌊' : '🏖️'}
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)] mt-2 italic">
            Fotos reales próximamente.
          </p>
        </section>

        {/* Apartamentos (solo Confort) */}
        {esConfort && apartamentos.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Apartamentos</h2>
            <p className="text-[var(--muted)] mb-6">
              Puedes reservar uno solo o la posada completa (los 4 apartamentos).
              En diciembre y Semana Santa solo se alquila completa.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {apartamentos.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <p className="font-semibold text-lg mb-1">{a.nombre}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Hasta {a.capacidad} personas
                  </p>
                  <p className="text-sm text-[var(--accent)] mt-2 capitalize">
                    {a.caracteristica === 'piscina' && '🏊 Salida a la piscina'}
                    {a.caracteristica === 'garage' && '🚗 Salida al garage'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Capacidad Beach */}
        {esBeach && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Capacidad y modalidad</h2>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="text-[var(--foreground)] mb-3">
                <strong>Casa completa para hasta 20 personas.</strong> Siempre se alquila completa,
                no por habitaciones.
              </p>
              <p className="text-sm text-[var(--muted)]">
                En temporada baja el precio depende del número de personas:
                <br />
                12 pers → $180 · 16 pers → $200 · 20 pers → $250 por noche.
                <br />
                En temporadas altas el precio es plano: $300 (alta) o $325 (Navidad).
              </p>
            </div>
          </section>
        )}

        {/* CTA reservar */}
        <section className="text-center py-8">
          <Link
            href={`/posada/${posada.slug}/reservar`}
            className="inline-block bg-[var(--primary)] hover:bg-[var(--primary-soft)] text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors"
          >
            Reservar fechas
          </Link>
          <p className="text-sm text-[var(--muted)] mt-3">
            Confirmamos manualmente cada reserva tras verificar el pago.
          </p>
        </section>
      </div>
    </div>
  );
}
