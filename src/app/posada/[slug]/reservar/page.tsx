import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ReservaForm } from '@/components/reserva-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `Reservar — ${slug === 'beach' ? 'San Andrés Beach' : 'San Andrés Confort'}` };
}

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== 'confort' && slug !== 'beach') notFound();

  const supabase = await createClient();

  const [posadaRes, aptosRes, tempsRes, preciosRes] = await Promise.all([
    supabase
      .from('posadas')
      .select('id, slug, nombre, tipo_alquiler')
      .eq('slug', slug)
      .eq('activa', true)
      .maybeSingle(),
    supabase
      .from('apartamentos')
      .select('id, nombre, capacidad, caracteristica, posada_id')
      .eq('activo', true)
      .order('orden'),
    supabase
      .from('temporadas')
      .select(
        'id, nombre, prioridad, estadia_minima_noches, fuerza_completa_confort, costo_extra_persona_usd, fecha_inicio, fecha_fin, activa',
      ),
    supabase
      .from('precios')
      .select('posada_id, temporada_id, modalidad, num_personas, precio_usd, activo'),
  ]);

  const posada = posadaRes.data;
  if (!posada) notFound();

  // Reservas confirmadas a futuro de esta posada (para bloquear fechas en el calendario)
  const hoyISO = new Date().toISOString().slice(0, 10);
  const { data: reservasConfirmadas } = await supabase
    .from('reservas')
    .select('fecha_inicio, fecha_fin, modalidad, apartamento_id, apartamentos_ids')
    .eq('posada_id', posada.id)
    .eq('estado', 'confirmada')
    .is('eliminada_at', null)
    .gte('fecha_fin', hoyISO);

  const aptosPosada =
    posada.slug === 'confort'
      ? (aptosRes.data ?? []).filter((a) => a.posada_id === posada.id)
      : [];

  return (
    <div className="bg-[var(--background)] min-h-screen">
      {/* Hero compacto */}
      <section className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <Link
            href={`/posada/${posada.slug}`}
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a {posada.nombre}
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl flex items-center gap-3">
            <Calendar className="w-7 h-7 text-[var(--accent)]" />
            Reservar en {posada.nombre}
          </h1>
          <p className="text-white/75 mt-1">
            El precio se calcula en vivo mientras ajustas las fechas.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
        <ReservaForm
          posada={{
            id: posada.id as string,
            slug: posada.slug as 'confort' | 'beach',
            nombre: posada.nombre as string,
            tipo_alquiler: posada.tipo_alquiler as 'individual_y_completa' | 'solo_completa',
          }}
          apartamentos={aptosPosada.map((a) => ({
            id: a.id as string,
            nombre: a.nombre as string,
            capacidad: a.capacidad as number | null,
            caracteristica: a.caracteristica as string | null,
          }))}
          temporadas={(tempsRes.data ?? []).map((t) => ({
            id: t.id as string,
            nombre: t.nombre as string,
            prioridad: t.prioridad as number,
            estadia_minima_noches: t.estadia_minima_noches as number,
            fuerza_completa_confort: t.fuerza_completa_confort as boolean,
            costo_extra_persona_usd: Number(t.costo_extra_persona_usd ?? 0),
            fecha_inicio: t.fecha_inicio as string | null,
            fecha_fin: t.fecha_fin as string | null,
            activa: t.activa as boolean,
          }))}
          precios={(preciosRes.data ?? []).map((p) => ({
            posada_id: p.posada_id as string,
            temporada_id: p.temporada_id as string,
            modalidad: p.modalidad as 'apartamento' | 'completa',
            num_personas: p.num_personas as number | null,
            precio_usd: Number(p.precio_usd),
            activo: p.activo as boolean,
          }))}
          reservasConfirmadas={(reservasConfirmadas ?? []).map((r) => ({
            fecha_inicio: r.fecha_inicio as string,
            fecha_fin: r.fecha_fin as string,
            modalidad: r.modalidad as 'apartamento' | 'completa',
            apartamento_id: r.apartamento_id as string | null,
            apartamentos_ids: (r.apartamentos_ids as string[] | null) ?? null,
          }))}
        />
      </div>
    </div>
  );
}
