import { exigirRol } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { formatoUSD } from '@/lib/formato';
import {
  actualizarPosada,
  actualizarApartamento,
  guardarTemporada,
  upsertPrecio,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Posadas y precios' };

export default async function PosadasConfigPage() {
  await exigirRol(['dueno']);
  const supabase = await createClient();

  const [posadasRes, aptosRes, tempsRes, preciosRes] = await Promise.all([
    supabase.from('posadas').select('id, slug, nombre, descripcion, tipo_alquiler').order('slug'),
    supabase.from('apartamentos').select('id, posada_id, nombre, caracteristica, capacidad, orden').order('orden'),
    supabase
      .from('temporadas')
      .select('id, nombre, fecha_inicio, fecha_fin, prioridad, estadia_minima_noches, fuerza_completa_confort, activa')
      .order('prioridad', { ascending: false })
      .order('nombre'),
    supabase
      .from('precios')
      .select('id, posada_id, temporada_id, modalidad, num_personas, precio_usd, activo')
      .order('precio_usd'),
  ]);

  const posadas = posadasRes.data ?? [];
  const aptos = aptosRes.data ?? [];
  const temporadas = tempsRes.data ?? [];
  const precios = preciosRes.data ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Posadas, apartamentos, temporadas y precios</h1>
        <p className="text-[var(--muted)] text-sm">
          Edita los datos del negocio. Los cambios se aplican al instante.
        </p>
      </div>

      {/* ============ POSADAS ============ */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Posadas</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {posadas.map((p) => (
            <form
              key={p.id as string}
              action={actualizarPosada}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 space-y-3"
            >
              <input type="hidden" name="posada_id" value={p.id as string} />
              <p className="text-xs uppercase text-[var(--muted)] tracking-widest">/{p.slug as string}</p>
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Nombre</span>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={p.nombre as string}
                  required
                  className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Descripción</span>
                <textarea
                  name="descripcion"
                  rows={3}
                  defaultValue={(p.descripcion as string) ?? ''}
                  className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
                />
              </label>
              <button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-soft)] text-white px-4 py-1.5 rounded-md text-sm">
                Guardar
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* ============ APARTAMENTOS (Confort) ============ */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Apartamentos (San Andrés Confort)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {aptos.map((a) => (
            <form
              key={a.id as string}
              action={actualizarApartamento}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 space-y-2 text-sm"
            >
              <input type="hidden" name="apto_id" value={a.id as string} />
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Nombre</span>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={a.nombre as string}
                  required
                  className="mt-1 w-full px-2 py-1 border border-[var(--border)] rounded bg-white"
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Característica</span>
                <select
                  name="caracteristica"
                  defaultValue={(a.caracteristica as string) ?? ''}
                  className="mt-1 w-full px-2 py-1 border border-[var(--border)] rounded bg-white"
                >
                  <option value="">—</option>
                  <option value="piscina">Piscina</option>
                  <option value="garage">Garage</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Capacidad (personas)</span>
                <input
                  type="number"
                  name="capacidad"
                  defaultValue={(a.capacidad as number) ?? 7}
                  min={1}
                  max={50}
                  required
                  className="mt-1 w-full px-2 py-1 border border-[var(--border)] rounded bg-white"
                />
              </label>
              <button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-soft)] text-white px-3 py-1 rounded text-xs w-full">
                Guardar
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* ============ TEMPORADAS ============ */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Temporadas</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Define los rangos de fechas con prioridad alta. Para Semana Santa o nuevas temporadas, crea una nueva abajo.
        </p>
        <div className="space-y-3 mb-4">
          {temporadas.map((t) => (
            <details key={t.id as string} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
              <summary className="cursor-pointer p-3 hover:bg-[var(--background)] flex items-center justify-between">
                <span className="font-medium">{t.nombre as string}</span>
                <span className="text-xs text-[var(--muted)]">
                  {t.fecha_inicio
                    ? `${t.fecha_inicio} → ${t.fecha_fin}`
                    : 'Temporada por defecto (sin fechas)'}
                  {' · '}
                  prioridad {t.prioridad as number} · mín {t.estadia_minima_noches as number} noches
                  {t.fuerza_completa_confort ? ' · Confort solo completa' : ''}
                </span>
              </summary>
              <FormTemporada t={t} />
            </details>
          ))}
        </div>
        <details className="bg-amber-50 border border-amber-300 rounded-lg overflow-hidden">
          <summary className="cursor-pointer p-3 hover:bg-amber-100 font-medium">
            + Crear nueva temporada (ej: Semana Santa 2026)
          </summary>
          <FormTemporada t={null} />
        </details>
      </section>

      {/* ============ PRECIOS ============ */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Precios</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Ajusta tarifas USD por noche. Para Beach baja, hay 3 filas (12/16/20 personas). Para todo lo demás, num_personas vacío.
        </p>
        <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                <Th>Posada</Th>
                <Th>Temporada</Th>
                <Th>Modalidad</Th>
                <Th>Pax</Th>
                <Th>USD/noche</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {precios.map((p) => {
                const posada = posadas.find((x) => x.id === p.posada_id);
                const temp = temporadas.find((x) => x.id === p.temporada_id);
                return (
                  <tr key={p.id as string} className="border-b border-[var(--border)] last:border-0">
                    <Td>{posada?.nombre ?? '—'}</Td>
                    <Td>{temp?.nombre ?? '—'}</Td>
                    <Td className="capitalize">{p.modalidad as string}</Td>
                    <Td>{p.num_personas ?? '—'}</Td>
                    <Td>
                      <form action={upsertPrecio} className="flex items-center gap-2">
                        <input type="hidden" name="posada_id" value={p.posada_id as string} />
                        <input type="hidden" name="temporada_id" value={p.temporada_id as string} />
                        <input type="hidden" name="modalidad" value={p.modalidad as string} />
                        <input type="hidden" name="num_personas" value={(p.num_personas as number | null) ?? ''} />
                        <span>$</span>
                        <input
                          type="number"
                          step="0.01"
                          name="precio_usd"
                          defaultValue={Number(p.precio_usd)}
                          required
                          min={0}
                          className="px-2 py-1 border border-[var(--border)] rounded bg-white w-24"
                        />
                        <button type="submit" className="text-xs bg-[var(--primary)] text-white px-2 py-1 rounded">
                          Guardar
                        </button>
                      </form>
                    </Td>
                    <Td>
                      <span className={`text-xs ${p.activo ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {p.activo ? '● activo' : '○ inactivo'}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <details className="mt-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <summary className="cursor-pointer p-3 hover:bg-[var(--background)] font-medium text-sm">
            + Agregar precio nuevo
          </summary>
          <form action={upsertPrecio} className="p-4 grid sm:grid-cols-5 gap-3 text-sm items-end">
            <label>
              <span className="text-xs text-[var(--muted)]">Posada</span>
              <select name="posada_id" required className="mt-1 w-full px-2 py-1 border rounded bg-white">
                {posadas.map((p) => (
                  <option key={p.id as string} value={p.id as string}>{p.nombre as string}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs text-[var(--muted)]">Temporada</span>
              <select name="temporada_id" required className="mt-1 w-full px-2 py-1 border rounded bg-white">
                {temporadas.map((t) => (
                  <option key={t.id as string} value={t.id as string}>{t.nombre as string}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs text-[var(--muted)]">Modalidad</span>
              <select name="modalidad" required className="mt-1 w-full px-2 py-1 border rounded bg-white">
                <option value="apartamento">Apartamento</option>
                <option value="completa">Completa</option>
              </select>
            </label>
            <label>
              <span className="text-xs text-[var(--muted)]">Personas (Beach baja)</span>
              <input type="number" name="num_personas" min={1} placeholder="vacío = plano" className="mt-1 w-full px-2 py-1 border rounded bg-white" />
            </label>
            <div className="flex gap-2">
              <input type="number" step="0.01" name="precio_usd" required min={0} placeholder="USD" className="px-2 py-1 border rounded bg-white w-24" />
              <button type="submit" className="bg-[var(--primary)] text-white px-3 py-1 rounded text-sm">Crear</button>
            </div>
          </form>
        </details>
      </section>
    </div>
  );
}

function FormTemporada({ t }: { t: { id: string; nombre: string; fecha_inicio: string | null; fecha_fin: string | null; prioridad: number; estadia_minima_noches: number; fuerza_completa_confort: boolean } | null }) {
  return (
    <form action={guardarTemporada} className="p-4 grid sm:grid-cols-2 gap-3 text-sm border-t border-[var(--border)]">
      {t && <input type="hidden" name="temporada_id" value={t.id} />}
      <label>
        <span className="text-xs text-[var(--muted)]">Nombre</span>
        <input type="text" name="nombre" required defaultValue={t?.nombre ?? ''} className="mt-1 w-full px-2 py-1 border rounded bg-white" />
      </label>
      <label>
        <span className="text-xs text-[var(--muted)]">Prioridad (1 baja, 3 alta)</span>
        <input type="number" name="prioridad" min={1} max={10} required defaultValue={t?.prioridad ?? 3} className="mt-1 w-full px-2 py-1 border rounded bg-white" />
      </label>
      <label>
        <span className="text-xs text-[var(--muted)]">Fecha inicio (vacío = baja)</span>
        <input type="date" name="fecha_inicio" defaultValue={t?.fecha_inicio ?? ''} className="mt-1 w-full px-2 py-1 border rounded bg-white" />
      </label>
      <label>
        <span className="text-xs text-[var(--muted)]">Fecha fin (vacío = baja)</span>
        <input type="date" name="fecha_fin" defaultValue={t?.fecha_fin ?? ''} className="mt-1 w-full px-2 py-1 border rounded bg-white" />
      </label>
      <label>
        <span className="text-xs text-[var(--muted)]">Mín. noches</span>
        <input type="number" name="estadia_minima_noches" min={1} required defaultValue={t?.estadia_minima_noches ?? 1} className="mt-1 w-full px-2 py-1 border rounded bg-white" />
      </label>
      <label className="flex items-center gap-2 mt-5">
        <input type="checkbox" name="fuerza_completa_confort" value="true" defaultChecked={t?.fuerza_completa_confort ?? false} />
        <span>En Confort, esta temporada solo permite "completa"</span>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-soft)] text-white px-4 py-1.5 rounded text-sm">
          {t ? 'Guardar cambios' : 'Crear temporada'}
        </button>
      </div>
    </form>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)] px-3 py-2">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
