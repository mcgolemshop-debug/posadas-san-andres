import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Users,
  Bed,
  MapPin,
  Waves,
  Sun,
  ShieldCheck,
  Sparkles,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { urlFotoPosada } from '@/lib/storage/fotos';

export const dynamic = 'force-dynamic';

interface PosadaCardData {
  slug: string;
  nombre: string;
  descripcion: string | null;
  tipo_alquiler: 'individual_y_completa' | 'solo_completa';
  foto_portada: string | null;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: posadas, error } = await supabase
    .from('posadas')
    .select('slug, nombre, descripcion, tipo_alquiler, foto_portada')
    .eq('activa', true)
    .order('slug');

  return (
    <div>
      {/* =====================  HERO CINEMATOGRÁFICO  ===================== */}
      <section className="relative overflow-hidden">
        {/* Fondo gradient profundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c4a6e] via-[#075985] to-[#164e63]" />
        {/* Capa de luz */}
        <div className="absolute inset-0 bg-grain opacity-100" />
        {/* Forma orgánica decorativa */}
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-gradient-to-tr from-[var(--accent-warm)]/30 to-transparent blur-3xl" />
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-br from-[var(--secondary)]/30 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-24 sm:py-32 lg:py-40 text-center">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs uppercase tracking-widest mb-8">
            <MapPin className="w-3.5 h-3.5" /> Chichiriviche · Estado Falcón
          </p>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.05] mb-8">
            Tu escapada al{' '}
            <span className="italic text-[var(--accent)] block sm:inline">caribe venezolano</span>{' '}
            empieza aquí
          </h1>

          <p className="text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed mb-12">
            Dos posadas pensadas para descansar: apartamentos individuales para familias o
            una casa completa frente al mar para grupos grandes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/posada/confort"
              className="group inline-flex items-center gap-2 bg-white text-[var(--primary)] hover:bg-[var(--accent)] hover:text-white px-6 py-3.5 rounded-full font-semibold shadow-lg transition-all hover:shadow-xl"
            >
              San Andrés Confort
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/posada/beach"
              className="group inline-flex items-center gap-2 bg-[var(--secondary)] text-white hover:bg-[var(--secondary-hover)] px-6 py-3.5 rounded-full font-semibold shadow-lg transition-all hover:shadow-xl"
            >
              San Andrés Beach
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm">
            <span className="flex items-center gap-1.5"><Sun className="w-4 h-4 text-[var(--accent)]" /> Sol todo el año</span>
            <span className="flex items-center gap-1.5"><Waves className="w-4 h-4 text-[var(--secondary)]" /> Frente al mar</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-300" /> Reserva con confirmación manual</span>
          </div>
        </div>
      </section>

      {/* =====================  POSADAS  ===================== */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <p className="inline-block text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-3">
            Elige dónde quedarte
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--foreground)] mb-3">
            Dos experiencias, un mismo cariño
          </h2>
          <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
            Selecciona la posada que mejor se adapta a tu grupo para ver disponibilidad y reservar.
          </p>
        </div>

        {error && (
          <p className="text-center text-[var(--danger)] mb-6">
            No pudimos cargar las posadas. Recarga la página.
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {(posadas ?? []).map((p, i) => (
            <PosadaCard key={p.slug} posada={p} index={i} />
          ))}
        </div>
      </section>

      {/* =====================  POR QUÉ NOSOTROS  ===================== */}
      <section className="bg-[var(--surface-elevated)] border-y border-[var(--border-subtle)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <h2 className="font-display text-3xl text-center mb-12">
            Por qué reservar en Posadas San Andrés
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <Feature
              icon={<Bed className="w-6 h-6" />}
              titulo="Espacios cuidados"
              desc="Apartamentos para 7 personas con piscina o garage privado. Casa completa para 20."
            />
            <Feature
              icon={<Sparkles className="w-6 h-6" />}
              titulo="Atención personal"
              desc="Cada reserva la verificamos a mano: nada de bots, somos personas reales atendiéndote."
            />
            <Feature
              icon={<Clock className="w-6 h-6" />}
              titulo="Sin sorpresas"
              desc="Precios claros, calculados noche por noche. Mínimo de estadía visible antes de pagar."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/* --------------- Componentes internos --------------- */

function PosadaCard({ posada, index }: { posada: PosadaCardData; index: number }) {
  const esBeach = posada.slug === 'beach';
  const etiqueta = posada.tipo_alquiler === 'solo_completa'
    ? 'Casa completa · grupos grandes'
    : 'Apartamento individual o casa completa';

  const styling = esBeach
    ? {
        gradient: 'from-cyan-600 via-sky-700 to-blue-900',
        decoration: 'from-cyan-300/40',
        chipBg: 'bg-[var(--secondary-light)] text-[var(--secondary-hover)]',
        icon: <Waves className="w-16 h-16" />,
        capacidad: 'Hasta 20 personas',
      }
    : {
        gradient: 'from-amber-500 via-orange-700 to-rose-900',
        decoration: 'from-amber-300/40',
        chipBg: 'bg-[var(--accent-light)] text-[var(--accent-hover)]',
        icon: <Sun className="w-16 h-16" />,
        capacidad: 'Hasta 28 personas (4 aptos de 7)',
      };

  const portadaUrl = urlFotoPosada(posada.foto_portada);

  return (
    <Link
      href={`/posada/${posada.slug}`}
      style={{ animationDelay: `${index * 100}ms` }}
      className="group relative block rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-md hover:shadow-2xl transition-all hover:-translate-y-1 animate-in"
    >
      {/* Hero visual de la card */}
      <div className={`relative h-64 flex items-center justify-center overflow-hidden ${portadaUrl ? '' : `bg-gradient-to-br ${styling.gradient}`}`}>
        {portadaUrl ? (
          <Image
            src={portadaUrl}
            alt={posada.nombre}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <>
            <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br ${styling.decoration} to-transparent blur-2xl`} />
            <div className="relative text-white/90 group-hover:scale-110 transition-transform duration-500">
              {styling.icon}
            </div>
          </>
        )}
        {/* Chip de etiqueta */}
        <div className="absolute top-4 left-4 z-10">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/90 text-[var(--primary)]`}>
            {etiqueta}
          </span>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-6 sm:p-7">
        <h3 className="font-display text-2xl sm:text-3xl mb-3 text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
          {posada.nombre}
        </h3>
        <p className="text-[var(--foreground-muted)] leading-relaxed mb-5 line-clamp-3">
          {posada.descripcion ?? 'Sin descripción todavía.'}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
          <span className="flex items-center gap-1.5 text-sm text-[var(--foreground-muted)]">
            <Users className="w-4 h-4" /> {styling.capacidad}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] group-hover:gap-2 transition-all">
            Ver y reservar
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Feature({ icon, titulo, desc }: { icon: React.ReactNode; titulo: string; desc: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl mb-2">{titulo}</h3>
      <p className="text-[var(--foreground-muted)] text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
