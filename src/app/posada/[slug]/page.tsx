import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bed,
  Car,
  Waves,
  Users,
  Sun,
  CheckCircle2,
  Star,
  Calendar,
  ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { formatoUSD } from '@/lib/formato';
import { urlFotoPosada } from '@/lib/storage/fotos';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

  const [posadaRes, preciosRes] = await Promise.all([
    supabase
      .from('posadas')
      .select('id, slug, nombre, descripcion, tipo_alquiler, foto_portada, galeria_urls')
      .eq('slug', slug)
      .eq('activa', true)
      .maybeSingle(),
    supabase
      .from('precios')
      .select('precio_usd, modalidad, num_personas'),
  ]);

  const posada = posadaRes.data;
  if (!posada) notFound();

  const { data: apartamentos } = await supabase
    .from('apartamentos')
    .select('id, nombre, caracteristica, capacidad, orden, foto_portada')
    .eq('posada_id', posada.id)
    .eq('activo', true)
    .order('orden');

  const preciosPosada = preciosRes.data ?? [];
  const precioMin =
    preciosPosada.length > 0
      ? Math.min(...preciosPosada.map((p) => Number(p.precio_usd)))
      : null;

  const esConfort = posada.slug === 'confort';
  const esBeach = posada.slug === 'beach';

  // Styling por posada
  const theme = esBeach
    ? {
        heroFrom: 'from-cyan-700',
        heroVia: 'via-sky-800',
        heroTo: 'to-blue-900',
        accentBg: 'bg-[var(--secondary-light)]',
        accentText: 'text-[var(--secondary-hover)]',
        chipIcon: <Waves className="w-3.5 h-3.5" />,
      }
    : {
        heroFrom: 'from-amber-600',
        heroVia: 'via-orange-700',
        heroTo: 'to-rose-900',
        accentBg: 'bg-[var(--accent-light)]',
        accentText: 'text-[var(--accent-hover)]',
        chipIcon: <Sun className="w-3.5 h-3.5" />,
      };

  return (
    <div>
      {/* =====================  HERO  ===================== */}
      <section className={`relative overflow-hidden text-white bg-gradient-to-br ${theme.heroFrom} ${theme.heroVia} ${theme.heroTo}`}>
        <div className="absolute inset-0 bg-grain" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>

          <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs uppercase tracking-widest mb-5">
                {theme.chipIcon} {esBeach ? 'Frente al mar' : 'Posada de apartamentos'}
              </span>
              <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] mb-5">
                {posada.nombre}
              </h1>
              <p className="text-lg text-white/85 max-w-2xl leading-relaxed">
                {posada.descripcion}
              </p>
            </div>

            {precioMin && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 min-w-[200px] text-center">
                <p className="text-xs uppercase tracking-widest text-white/70 mb-1">Desde</p>
                <p className="font-display text-4xl text-white">{formatoUSD(precioMin)}</p>
                <p className="text-xs text-white/70">por noche</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* =====================  GALERÍA  ===================== */}
        <section>
          <SectionTitle eyebrow="Conoce el espacio" titulo="Galería" />
          {(() => {
            const gal = (posada.galeria_urls as string[] | null) ?? [];
            const portada = posada.foto_portada as string | null;
            const todas = portada ? [portada, ...gal] : gal;
            if (todas.length === 0) {
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-xl border border-[var(--border-subtle)] ${theme.accentBg} flex items-center justify-center text-[var(--foreground-subtle)]`}
                      >
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--foreground-subtle)] mt-3 italic text-center">
                    Fotos reales próximamente. Mientras tanto, espacios placeholder.
                  </p>
                </>
              );
            }
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {todas.slice(0, 8).map((path) => (
                  <div key={path} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-subtle)]">
                    <Image
                      src={urlFotoPosada(path)!}
                      alt={posada.nombre as string}
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* =====================  APARTAMENTOS (Confort) ===================== */}
        {esConfort && apartamentos && apartamentos.length > 0 && (
          <section>
            <SectionTitle eyebrow="Distribución" titulo="Los 4 apartamentos" />
            <p className="text-[var(--foreground-muted)] mb-8 max-w-3xl">
              Reserva uno solo o la posada completa (los 4 apartamentos juntos).
              En diciembre y Semana Santa solo se alquila completa.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {apartamentos.map((a) => (
                <ApartamentoCard
                  key={a.id as string}
                  nombre={a.nombre as string}
                  caracteristica={a.caracteristica as string | null}
                  capacidad={a.capacidad as number | null}
                  fotoPortada={a.foto_portada as string | null}
                />
              ))}
            </div>
          </section>
        )}

        {/* =====================  BEACH — Capacidad ===================== */}
        {esBeach && (
          <section>
            <SectionTitle eyebrow="Capacidad" titulo="Pensada para grupos grandes" />
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 shadow-sm">
              <div className="grid sm:grid-cols-[1fr_2fr] gap-8 items-center">
                <div className="text-center">
                  <p className="font-display text-7xl text-[var(--primary)]">20</p>
                  <p className="text-sm uppercase tracking-widest text-[var(--foreground-muted)] mt-1">personas</p>
                  <p className="text-xs text-[var(--foreground-subtle)] mt-3">2 pisos · casa completa</p>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-[var(--foreground-muted)]">
                    En temporada <strong>baja</strong> el precio se ajusta a tu grupo:
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Tarifa pax={12} usd={180} />
                    <Tarifa pax={16} usd={200} />
                    <Tarifa pax={20} usd={250} />
                  </div>
                  <p className="text-[var(--foreground-muted)] mt-3">
                    En <strong>alta</strong> el precio es plano: $300 (ago–sep) y $325 (Navidad).
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================  AMENIDADES  ===================== */}
        <section>
          <SectionTitle eyebrow="Lo que incluye" titulo="Amenidades" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Amenidad icon={<Waves className="w-5 h-5" />} label="Cerca del mar" />
            <Amenidad icon={<Car className="w-5 h-5" />} label={esConfort ? 'Garage privado' : 'Estacionamiento'} />
            <Amenidad icon={<Sun className="w-5 h-5" />} label="Clima cálido" />
            <Amenidad icon={<CheckCircle2 className="w-5 h-5" />} label="Pago seguro" />
          </div>
        </section>

        {/* =====================  CTA  ===================== */}
        <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[var(--accent)]/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[var(--secondary)]/20 blur-3xl" />
          <div className="relative">
            <Star className="w-8 h-8 text-[var(--accent)] mx-auto mb-3" fill="currentColor" />
            <h2 className="font-display text-3xl sm:text-4xl mb-3">
              ¿Listo para reservar?
            </h2>
            <p className="text-white/85 max-w-xl mx-auto mb-8">
              Selecciona tus fechas, calcula el total en vivo y envíanos tu solicitud.
              Te confirmamos en las próximas horas.
            </p>
            <Link
              href={`/posada/${posada.slug}/reservar`}
              className="inline-flex items-center gap-2 bg-white text-[var(--primary)] hover:bg-[var(--accent)] hover:text-white px-7 py-3.5 rounded-full font-semibold shadow-xl transition-all hover:scale-105"
            >
              <Calendar className="w-4 h-4" />
              Ver fechas y reservar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

/* --------------- Componentes internos --------------- */

function SectionTitle({ eyebrow, titulo }: { eyebrow: string; titulo: string }) {
  return (
    <div className="mb-8">
      <p className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">{eyebrow}</p>
      <h2 className="font-display text-3xl text-[var(--foreground)]">{titulo}</h2>
    </div>
  );
}

function ApartamentoCard({ nombre, caracteristica, capacidad, fotoPortada }: { nombre: string; caracteristica: string | null; capacidad: number | null; fotoPortada: string | null }) {
  const esPiscina = caracteristica === 'piscina';
  const esGarage = caracteristica === 'garage';
  const portadaUrl = urlFotoPosada(fotoPortada);
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
      {portadaUrl ? (
        <div className="relative h-32 w-full">
          <Image src={portadaUrl} alt={nombre} fill sizes="300px" className="object-cover" />
        </div>
      ) : null}
      <div className="p-5">
      <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] text-[var(--accent-hover)] flex items-center justify-center mb-3">
        <Bed className="w-5 h-5" />
      </div>
      <p className="font-display text-xl mb-1">{nombre}</p>
      <p className="flex items-center gap-1 text-sm text-[var(--foreground-muted)] mb-3">
        <Users className="w-3.5 h-3.5" /> Hasta {capacidad ?? '—'} personas
      </p>
      {esPiscina && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--secondary-light)] text-[var(--secondary-hover)] font-medium">
          <Waves className="w-3 h-3" /> Salida a piscina
        </span>
      )}
      {esGarage && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-hover)] font-medium">
          <Car className="w-3 h-3" /> Salida a garage
        </span>
      )}
      </div>
    </div>
  );
}

function Tarifa({ pax, usd }: { pax: number; usd: number }) {
  return (
    <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-center">
      <p className="font-display text-2xl text-[var(--primary)]">${usd}</p>
      <p className="text-xs text-[var(--foreground-muted)]">{pax} pers / noche</p>
    </div>
  );
}

function Amenidad({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl">
      <div className="w-10 h-10 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs sm:text-sm text-center text-[var(--foreground-muted)] font-medium">{label}</span>
    </div>
  );
}
