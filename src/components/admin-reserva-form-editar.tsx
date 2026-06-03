'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { editarReserva, type EstadoAccion } from '@/app/admin/(panel)/reservas/[id]/actions';
import { calcularPrecioReserva } from '@/lib/pricing/calcular';
import type { PrecioInfo, TemporadaInfo, ModalidadReserva } from '@/lib/pricing/tipos';
import { formatoUSD } from '@/lib/formato';

interface ApartamentoLite {
  id: string;
  nombre: string;
  capacidad: number | null;
}

interface ReservaInicial {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  modalidad: ModalidadReserva;
  apartamento_id: string | null;
  apartamentos_ids: string[] | null;
  num_personas: number;
  num_personas_extras: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  notas: string | null;
  descuento_usd: number;
  servicio_extra_usd: number;
  total_usd: number;
  posada_slug: 'confort' | 'beach';
  posada_id: string;
  tipo_alquiler: 'individual_y_completa' | 'solo_completa';
}

interface Props {
  reserva: ReservaInicial;
  apartamentos: ApartamentoLite[];
  temporadas: TemporadaInfo[];
  precios: PrecioInfo[];
}

export function AdminReservaFormEditar({ reserva, apartamentos, temporadas, precios }: Props) {
  const [fechaInicio, setFechaInicio] = useState(reserva.fecha_inicio);
  const [fechaFin, setFechaFin] = useState(reserva.fecha_fin);
  const [modalidad, setModalidad] = useState<ModalidadReserva>(reserva.modalidad);
  const [aptosSeleccionados, setAptosSeleccionados] = useState<string[]>(
    reserva.apartamentos_ids && reserva.apartamentos_ids.length > 0
      ? reserva.apartamentos_ids
      : reserva.apartamento_id ? [reserva.apartamento_id] : [],
  );
  const [numPersonas, setNumPersonas] = useState(reserva.num_personas);
  const [numPersonasExtras, setNumPersonasExtras] = useState(reserva.num_personas_extras);
  const [nombre, setNombre] = useState(reserva.cliente_nombre);
  const [telefono, setTelefono] = useState(reserva.cliente_telefono);
  const [email, setEmail] = useState(reserva.cliente_email);
  const [notas, setNotas] = useState(reserva.notas ?? '');
  const [descuentoUsd, setDescuentoUsd] = useState(reserva.descuento_usd);
  const [servicioExtraUsd, setServicioExtraUsd] = useState(reserva.servicio_extra_usd);

  const [estado, accion, pendiente] = useActionState<EstadoAccion | null, FormData>(editarReserva, null);

  const cantidadApartamentos = modalidad === 'apartamento' ? Math.max(1, aptosSeleccionados.length) : 1;

  const resultado = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    return calcularPrecioReserva({
      posada_slug: reserva.posada_slug,
      posada_id: reserva.posada_id,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      modalidad,
      num_personas: numPersonas,
      cantidad_apartamentos: cantidadApartamentos,
      num_personas_extras: numPersonasExtras,
      servicio_extra_usd: servicioExtraUsd,
      descuento_usd: descuentoUsd,
      temporadas,
      precios,
    });
  }, [fechaInicio, fechaFin, modalidad, numPersonas, numPersonasExtras, cantidadApartamentos, servicioExtraUsd, descuentoUsd, reserva, temporadas, precios]);

  const totalCalculado = resultado?.total_usd ?? 0;

  return (
    <form action={accion} className="grid lg:grid-cols-[1fr_360px] gap-6">
      <input type="hidden" name="reserva_id" value={reserva.id} />
      <input type="hidden" name="apartamento_id" value={aptosSeleccionados[0] ?? ''} />
      {aptosSeleccionados.map((id) => (
        <input key={id} type="hidden" name="apartamentos_ids" value={id} />
      ))}
      <input type="hidden" name="total_usd" value={totalCalculado.toFixed(2)} />

      <div className="space-y-5">
        {/* Cliente */}
        <Seccion titulo="Cliente">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nombre"><input className={ic} type="text" name="cliente_nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></Field>
            <Field label="Teléfono"><input className={ic} type="tel" name="cliente_telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} required /></Field>
            <Field label="Email"><input className={ic} type="email" name="cliente_email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Field label="Personas"><input className={ic} type="number" name="num_personas" min={1} value={numPersonas} onChange={(e) => setNumPersonas(Number(e.target.value))} required /></Field>
          </div>
          <Field label="Notas"><textarea className={ic} name="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} /></Field>
        </Seccion>

        {/* Fechas */}
        <Seccion titulo="Fechas">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Llegada"><input className={ic} type="date" name="fecha_inicio" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required /></Field>
            <Field label="Salida"><input className={ic} type="date" name="fecha_fin" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required /></Field>
          </div>
        </Seccion>

        {/* Modalidad y apartamentos */}
        {reserva.tipo_alquiler === 'individual_y_completa' && (
          <Seccion titulo="Modalidad">
            <select name="modalidad" value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadReserva)} className={ic}>
              <option value="apartamento">Apartamento(s)</option>
              <option value="completa">Posada completa</option>
            </select>
            {modalidad === 'apartamento' && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {apartamentos.map((a) => {
                  const sel = aptosSeleccionados.includes(a.id);
                  return (
                    <label key={a.id} className={`flex items-center gap-2 p-2 border rounded ${sel ? 'border-[var(--primary)] bg-[var(--primary-light)]/30' : 'border-[var(--border)]'} cursor-pointer text-sm`}>
                      <input type="checkbox" checked={sel} onChange={() => setAptosSeleccionados((p) => sel ? p.filter((id) => id !== a.id) : [...p, a.id])} className="accent-[var(--primary)]" />
                      <span>{a.nombre} ({a.capacidad ?? 7} pers)</span>
                    </label>
                  );
                })}
              </div>
            )}
          </Seccion>
        )}
        {reserva.tipo_alquiler === 'solo_completa' && <input type="hidden" name="modalidad" value="completa" />}

        {/* Extras y descuento */}
        <Seccion titulo="Cobros adicionales / descuento">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Personas extras">
              <input className={ic} type="number" name="num_personas_extras" min={0} value={numPersonasExtras} onChange={(e) => setNumPersonasExtras(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Servicio extra (USD)">
              <input className={ic} type="number" step="0.01" name="servicio_extra_usd" min={0} value={servicioExtraUsd} onChange={(e) => setServicioExtraUsd(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Descuento (USD)">
              <input className={ic} type="number" step="0.01" name="descuento_usd" min={0} value={descuentoUsd} onChange={(e) => setDescuentoUsd(Number(e.target.value) || 0)} />
            </Field>
          </div>
        </Seccion>

        {estado?.ok && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {estado.ok}
          </div>
        )}
        {estado?.error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {estado.error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href={`/admin/reservas/${reserva.id}`} className="px-4 py-2 border border-[var(--border)] rounded-md text-sm hover:bg-[var(--background)]">
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Cancelar
          </Link>
          <button type="submit" disabled={pendiente} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-gray-300 text-white font-semibold px-5 py-2 rounded-md text-sm flex items-center gap-2">
            <Save className="w-4 h-4" /> {pendiente ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <aside>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sticky top-24">
          <p className="font-display text-lg mb-3">Resumen recalculado</p>
          {resultado && (
            <div className="space-y-2 text-sm">
              <Linea k="Subtotal" v={formatoUSD(resultado.subtotal_usd)} />
              {resultado.extras_personas_usd > 0 && <Linea k="Extras personas" v={formatoUSD(resultado.extras_personas_usd)} />}
              {resultado.servicio_extra_usd > 0 && <Linea k="Servicio extra" v={formatoUSD(resultado.servicio_extra_usd)} />}
              {resultado.descuento_usd > 0 && <Linea k="Descuento" v={`−${formatoUSD(resultado.descuento_usd)}`} success />}
              <div className="pt-3 mt-3 border-t border-[var(--border)] flex justify-between items-baseline">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-display text-[var(--primary)]">{formatoUSD(resultado.total_usd)}</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}

const ic = 'mt-1 w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg bg-white text-sm';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
      <h3 className="font-display text-lg mb-3">{titulo}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[var(--foreground-muted)]">{label}</span>
      {children}
    </label>
  );
}
function Linea({ k, v, success }: { k: string; v: string; success?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--foreground-muted)]">{k}</span>
      <span className={success ? 'text-emerald-700 font-medium' : ''}>{v}</span>
    </div>
  );
}
