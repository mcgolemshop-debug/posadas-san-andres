import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

// Forzamos render dinámico porque leemos de Supabase
export const dynamic = 'force-dynamic';

interface PosadaCardData {
  slug: string;
  nombre: string;
  descripcion: string | null;
  tipo_alquiler: 'individual_y_completa' | 'solo_completa';
}

export default async function Home() {
  const supabase = await createClient();
  const { data: posadas, error } = await supabase
    .from('posadas')
    .select('slug, nombre, descripcion, tipo_alquiler')
    .eq('activa', true)
    .order('slug');

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--primary)] to-[var(--primary-soft)] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <p className="text-sm tracking-widest uppercase text-amber-200/80 mb-4">
            Chichiriviche · Estado Falcón
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-6">
            Posadas frente al mar para tu próxima escapada
          </h1>
          <p className="text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
            Elige entre <strong className="font-semibold">San Andrés Confort</strong>, con
            apartamentos independientes ideales para familias, o{' '}
            <strong className="font-semibold">San Andrés Beach</strong>, una casa completa
            para grupos grandes frente al mar.
          </p>
        </div>
      </section>

      {/* Selector de posada */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-2">
          ¿Cuál te queda mejor?
        </h2>
        <p className="text-center text-[var(--muted)] mb-10">
          Selecciona la posada que prefieres para ver disponibilidad y reservar.
        </p>

        {error && (
          <p className="text-center text-red-600">
            No pudimos cargar las posadas. Recarga la página o intenta más tarde.
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {(posadas ?? []).map((p) => (
            <PosadaCard key={p.slug} posada={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PosadaCard({ posada }: { posada: PosadaCardData }) {
  const esBeach = posada.slug === 'beach';
  const colorBg = esBeach ? 'from-cyan-700 to-blue-800' : 'from-amber-700 to-orange-800';
  const etiqueta = posada.tipo_alquiler === 'solo_completa'
    ? 'Casa completa para grupos'
    : 'Apartamento individual o casa completa';

  return (
    <Link
      href={`/posada/${posada.slug}`}
      className="group block rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
    >
      {/* Placeholder de foto: cuando Orlando suba fotos reales lo reemplazamos */}
      <div
        className={`h-56 bg-gradient-to-br ${colorBg} flex items-center justify-center text-white`}
      >
        <span className="text-5xl font-light tracking-wide">
          {esBeach ? '🌊' : '🏠'}
        </span>
      </div>
      <div className="p-6">
        <p className="text-xs tracking-widest uppercase text-[var(--accent)] mb-2">
          {etiqueta}
        </p>
        <h3 className="text-2xl font-semibold mb-2 group-hover:text-[var(--primary)] transition-colors">
          {posada.nombre}
        </h3>
        <p className="text-[var(--muted)] leading-relaxed mb-4">
          {posada.descripcion ?? 'Sin descripción.'}
        </p>
        <span className="inline-flex items-center gap-1 text-[var(--primary)] font-medium group-hover:gap-2 transition-all">
          Ver y reservar
          <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}
