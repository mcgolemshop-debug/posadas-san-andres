import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import { AdminReservaFormEditar } from '@/components/admin-reserva-form-editar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Editar reserva' };

export default async function EditarReservaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await getSesionAdminEstricto();
  const supabase = await createClient();

  const { data: r } = await supabase
    .from('reservas')
    .select(`id, posada_id, fecha_inicio, fecha_fin, modalidad, apartamento_id, apartamentos_ids,
       num_personas, num_personas_extras, cliente_nombre, cliente_telefono, cliente_email, notas,
       descuento_usd, servicio_extra_usd, nota_descuento, nota_servicio_extra, total_usd, gestor_id,
       posadas(slug, nombre, tipo_alquiler)`)
    .eq('id', id)
    .maybeSingle();

  if (!r) notFound();

  // Permiso para editar: Dueño todo, Vulcanos solo las suyas
  const puedeEditar =
    sesion.perfil.rol === 'dueno' ||
    (sesion.perfil.rol === 'vulcanos' && r.gestor_id === sesion.user_id);
  if (!puedeEditar) notFound();

  const posada = Array.isArray(r.posadas) ? r.posadas[0] : r.posadas;

  // Datos auxiliares
  const [aptosRes, tempsRes, preciosRes] = await Promise.all([
    supabase.from('apartamentos').select('id, nombre, capacidad').eq('posada_id', r.posada_id).eq('activo', true).order('orden'),
    supabase.from('temporadas').select('id, nombre, prioridad, estadia_minima_noches, fuerza_completa_confort, costo_extra_persona_usd, fecha_inicio, fecha_fin, activa'),
    supabase.from('precios').select('posada_id, temporada_id, modalidad, num_personas, precio_usd, activo').eq('activo', true),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Editar reserva</h1>
      <p className="text-sm text-[var(--foreground-muted)] mb-6">
        #{(r.id as string).slice(0, 8).toUpperCase()} — {posada?.nombre as string}
      </p>

      <AdminReservaFormEditar
        reserva={{
          id: r.id as string,
          fecha_inicio: r.fecha_inicio as string,
          fecha_fin: r.fecha_fin as string,
          modalidad: r.modalidad as 'apartamento' | 'completa',
          apartamento_id: r.apartamento_id as string | null,
          apartamentos_ids: (r.apartamentos_ids as string[] | null) ?? null,
          num_personas: r.num_personas as number,
          num_personas_extras: (r.num_personas_extras as number) ?? 0,
          cliente_nombre: r.cliente_nombre as string,
          cliente_telefono: r.cliente_telefono as string,
          cliente_email: r.cliente_email as string,
          notas: (r.notas as string | null) ?? null,
          descuento_usd: Number(r.descuento_usd ?? 0),
          servicio_extra_usd: Number(r.servicio_extra_usd ?? 0),
          nota_descuento: (r.nota_descuento as string | null) ?? null,
          nota_servicio_extra: (r.nota_servicio_extra as string | null) ?? null,
          total_usd: Number(r.total_usd),
          posada_slug: (posada?.slug as 'confort' | 'beach') ?? 'confort',
          posada_id: r.posada_id as string,
          tipo_alquiler: (posada?.tipo_alquiler as 'individual_y_completa' | 'solo_completa') ?? 'individual_y_completa',
        }}
        apartamentos={(aptosRes.data ?? []).map((a) => ({
          id: a.id as string,
          nombre: a.nombre as string,
          capacidad: a.capacidad as number | null,
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
      />
    </div>
  );
}
