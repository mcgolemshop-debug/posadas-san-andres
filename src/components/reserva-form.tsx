'use client';

import { useActionState, useMemo, useState } from 'react';
import {
  CalendarDays,
  Bed,
  Users,
  UserCircle,
  Receipt,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { calcularPrecioReserva } from '@/lib/pricing/calcular';
import type {
  ModalidadReserva,
  PrecioInfo,
  TemporadaInfo,
} from '@/lib/pricing/tipos';
import { formatoFechaCorta, formatoUSD, hoyISO } from '@/lib/formato';
import { enviarReserva, type EstadoEnvio } from '@/app/posada/[slug]/reservar/actions';

interface ApartamentoLite {
  id: string;
  nombre: string;
  capacidad: number | null;
  caracteristica: string | null;
}

interface Props {
  posada: {
    id: string;
    slug: 'confort' | 'beach';
    nombre: string;
    tipo_alquiler: 'individual_y_completa' | 'solo_completa';
  };
  apartamentos: ApartamentoLite[];
  temporadas: TemporadaInfo[];
  precios: PrecioInfo[];
}

const OPCIONES_BEACH = [12, 16, 20];

export function ReservaForm({ posada, apartamentos, temporadas, precios }: Props) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [modalidad, setModalidad] = useState<ModalidadReserva>(
    posada.tipo_alquiler === 'solo_completa' ? 'completa' : 'apartamento',
  );
  const [apartamentoId, setApartamentoId] = useState(apartamentos[0]?.id ?? '');
  const [numPersonas, setNumPersonas] = useState<number>(posada.slug === 'beach' ? 12 : 4);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [estadoEnvio, formAction, enviando] = useActionState<EstadoEnvio | null, FormData>(
    enviarReserva,
    null,
  );

  const resultado = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    return calcularPrecioReserva({
      posada_slug: posada.slug,
      posada_id: posada.id,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      modalidad,
      num_personas: numPersonas,
      temporadas,
      precios,
    });
  }, [fechaInicio, fechaFin, modalidad, numPersonas, posada, temporadas, precios]);

  const puedeEnviar =
    !!resultado &&
    !resultado.tiene_errores &&
    resultado.cumple_estadia_minima &&
    resultado.total_usd > 0 &&
    nombre.trim().length > 0 &&
    telefono.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email) &&
    comprobante !== null &&
    (modalidad === 'completa' || apartamentoId);

  return (
    <form action={formAction} className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
      <input type="hidden" name="posada_slug" value={posada.slug} />

      {/* Columna izquierda */}
      <div className="space-y-5">
        <Section icon={<CalendarDays className="w-5 h-5" />} titulo="Fechas">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Llegada (2:00 PM)">
              <input
                type="date" name="fecha_inicio" required
                value={fechaInicio} min={hoyISO()}
                onChange={(e) => setFechaInicio(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Salida (12:00 m)">
              <input
                type="date" name="fecha_fin" required
                value={fechaFin} min={fechaInicio || hoyISO()}
                onChange={(e) => setFechaFin(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {posada.tipo_alquiler === 'individual_y_completa' ? (
          <Section icon={<Bed className="w-5 h-5" />} titulo="¿Cómo quieres reservar?">
            <div className="grid sm:grid-cols-2 gap-3">
              <OpcionRadio
                checked={modalidad === 'apartamento'}
                onChange={() => setModalidad('apartamento')}
                name="modalidad" value="apartamento"
                titulo="Un apartamento"
                desc="Hasta 7 personas. No disponible en dic/Semana Santa."
              />
              <OpcionRadio
                checked={modalidad === 'completa'}
                onChange={() => setModalidad('completa')}
                name="modalidad" value="completa"
                titulo="Posada completa"
                desc="Hasta 28 personas. Único en dic/Semana Santa."
              />
            </div>
          </Section>
        ) : (
          <input type="hidden" name="modalidad" value="completa" />
        )}

        {modalidad === 'apartamento' ? (
          <Section icon={<Bed className="w-5 h-5" />} titulo="Apartamento">
            <select
              name="apartamento_id" value={apartamentoId} required
              onChange={(e) => setApartamentoId(e.target.value)}
              className={inputClass}
            >
              {apartamentos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                  {a.caracteristica ? ` — ${a.caracteristica}` : ''}
                  {a.capacidad ? ` (hasta ${a.capacidad} pers)` : ''}
                </option>
              ))}
            </select>
          </Section>
        ) : (
          <input type="hidden" name="apartamento_id" value="" />
        )}

        <Section icon={<Users className="w-5 h-5" />} titulo="Personas">
          {posada.slug === 'beach' ? (
            <>
              <select
                name="num_personas" value={numPersonas}
                onChange={(e) => setNumPersonas(Number(e.target.value))}
                className={inputClass}
              >
                {OPCIONES_BEACH.map((n) => (
                  <option key={n} value={n}>{n} personas</option>
                ))}
              </select>
              <p className="text-xs text-[var(--foreground-subtle)] mt-2">
                En baja el precio varía con el grupo. En altas es plano.
              </p>
            </>
          ) : (
            <input
              type="number" name="num_personas"
              min={1} max={modalidad === 'completa' ? 28 : 7}
              value={numPersonas}
              onChange={(e) => setNumPersonas(Number(e.target.value))}
              className={inputClass}
            />
          )}
        </Section>

        <Section icon={<UserCircle className="w-5 h-5" />} titulo="Tus datos">
          <div className="space-y-3">
            <Field label="Nombre completo">
              <input type="text" name="cliente_nombre" required
                value={nombre} onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Teléfono / WhatsApp">
                <input type="tel" name="cliente_telefono" required
                  value={telefono} onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+58 ..." className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input type="email" name="cliente_email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Notas (opcional)">
              <textarea name="notas" rows={3}
                value={notas} onChange={(e) => setNotas(e.target.value)}
                placeholder="Solicitudes especiales, hora estimada de llegada…"
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Comprobante obligatorio */}
        <div className="bg-gradient-to-br from-[var(--accent-light)] to-[var(--warning-light)] border-2 border-[var(--accent)] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Receipt className="w-6 h-6 text-[var(--accent-hover)] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-[var(--accent-hover)] mb-1">Comprobante de pago obligatorio</p>
              <p className="text-sm text-[var(--foreground-muted)] mb-3">
                Sube una imagen o PDF del comprobante de transferencia / depósito.
                Sin esto no podemos procesar tu reserva.
              </p>
              <input
                type="file" name="comprobante" required
                accept="image/*,.pdf"
                onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[var(--primary)] file:text-white file:cursor-pointer hover:file:bg-[var(--primary-hover)]"
              />
              {comprobante && (
                <p className="text-xs text-[var(--success)] mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {comprobante.name} ({Math.round(comprobante.size / 1024)} KB)
                </p>
              )}
            </div>
          </div>
        </div>

        {estadoEnvio?.error && (
          <div className="bg-[var(--danger-light)] border border-[var(--danger)] rounded-xl p-4 flex gap-2 text-sm text-[var(--danger)]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{estadoEnvio.error}</span>
          </div>
        )}

        <button
          type="submit" disabled={!puedeEnviar || enviando}
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--foreground-subtle)] disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2 text-base"
        >
          {enviando ? (
            <>Enviando…</>
          ) : (
            <><Send className="w-4 h-4" /> Enviar solicitud de reserva</>
          )}
        </button>
      </div>

      {/* Sidebar resumen */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="bg-[var(--surface)] border-2 border-[var(--primary)]/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-display text-xl">Resumen</h3>
          </div>

          {!resultado ? (
            <div className="text-center py-6 text-[var(--foreground-subtle)]">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Elige fechas para calcular el precio.</p>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <LineaResumen k="Llegada" v={formatoFechaCorta(fechaInicio)} />
              <LineaResumen k="Salida" v={formatoFechaCorta(fechaFin)} />
              <LineaResumen k="Noches" v={String(resultado.cantidad_noches)} />
              <LineaResumen k="Modalidad" v={modalidad === 'completa' ? 'Posada completa' : 'Apartamento'} />

              {resultado.temporadas_aplicadas.length > 0 && (
                <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
                  <p className="text-xs uppercase tracking-widest text-[var(--foreground-subtle)] mb-1.5">
                    Temporadas
                  </p>
                  {resultado.temporadas_aplicadas.map((t) => (
                    <p key={t.id} className="text-xs text-[var(--foreground-muted)] flex justify-between">
                      <span>{t.nombre}</span>
                      <span>{t.cantidad_noches} {t.cantidad_noches === 1 ? 'noche' : 'noches'}</span>
                    </p>
                  ))}
                </div>
              )}

              {resultado.advertencias.length > 0 && (
                <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] space-y-1">
                  {resultado.advertencias.map((a, i) => (
                    <p key={i} className="text-xs text-[var(--danger)] flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{a}</span>
                    </p>
                  ))}
                </div>
              )}

              <div className="pt-4 mt-4 border-t-2 border-[var(--primary)]/10">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-3xl text-[var(--primary)]">
                    {formatoUSD(resultado.total_usd)}
                  </span>
                </div>
                <p className="text-xs text-[var(--foreground-subtle)] text-right mt-0.5">dólares</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--foreground-subtle)] mt-4 px-2 text-center leading-relaxed">
          Al enviar, tu reserva queda <strong className="text-[var(--foreground)]">pendiente</strong>.
          Te confirmamos por email tras verificar el comprobante.
        </p>
      </aside>
    </form>
  );
}

/* --------------- subcomponentes UI --------------- */

const inputClass =
  'w-full px-3.5 py-2.5 border border-[var(--border-strong)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-shadow';

function Section({ icon, titulo, children }: { icon: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--primary)]">{icon}</span>
        <h3 className="font-display text-xl">{titulo}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[var(--foreground-muted)] mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function OpcionRadio({ checked, onChange, name, value, titulo, desc }: { checked: boolean; onChange: () => void; name: string; value: string; titulo: string; desc: string }) {
  return (
    <label
      className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
        checked
          ? 'border-[var(--primary)] bg-[var(--primary-light)]/40'
          : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
      }`}
    >
      <input
        type="radio" name={name} value={value} checked={checked} onChange={onChange}
        className="mt-1 accent-[var(--primary)]"
      />
      <div>
        <p className="font-semibold text-[var(--foreground)]">{titulo}</p>
        <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{desc}</p>
      </div>
    </label>
  );
}

function LineaResumen({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--foreground-muted)]">{k}</span>
      <span className="font-medium text-[var(--foreground)]">{v}</span>
    </div>
  );
}
