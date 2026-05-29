'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format, addDays, startOfToday } from 'date-fns';
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
  XCircle,
} from 'lucide-react';
import { calcularPrecioReserva } from '@/lib/pricing/calcular';
import type {
  ModalidadReserva,
  PrecioInfo,
  TemporadaInfo,
} from '@/lib/pricing/tipos';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';
import { enviarReserva, type EstadoEnvio } from '@/app/posada/[slug]/reservar/actions';
import {
  fechasOcupadasParaContexto,
  rangoChocaConOcupadas,
  type ReservaCalendar,
} from '@/components/calendario-disponibilidad';

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
  reservasConfirmadas: ReservaCalendar[];
}

const OPCIONES_BEACH = [12, 16, 20];

export function ReservaForm({ posada, apartamentos, temporadas, precios, reservasConfirmadas }: Props) {
  const [rango, setRango] = useState<DateRange | undefined>(undefined);
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
  const [avisoLimpieza, setAvisoLimpieza] = useState<string | null>(null);

  // Cantidad de meses visibles en el calendario: 1 en móvil, 2 en desktop.
  // Empezamos en 1 para no causar hydration mismatch.
  const [numMeses, setNumMeses] = useState(1);
  useEffect(() => {
    const actualizar = () => setNumMeses(window.innerWidth >= 768 ? 2 : 1);
    actualizar();
    window.addEventListener('resize', actualizar);
    return () => window.removeEventListener('resize', actualizar);
  }, []);

  // Fechas en formato YYYY-MM-DD para el cálculo y los hidden inputs
  const fechaInicio = rango?.from ? format(rango.from, 'yyyy-MM-dd') : '';
  const fechaFin = rango?.to ? format(rango.to, 'yyyy-MM-dd') : '';

  // Fechas deshabilitadas en función del contexto (modalidad + apto)
  const fechasOcupadas = useMemo(() => {
    const ctx =
      modalidad === 'completa'
        ? ({ modalidad: 'completa', apartamentoId: null } as const)
        : ({ modalidad: 'apartamento', apartamentoId: apartamentoId } as const);
    return fechasOcupadasParaContexto(reservasConfirmadas, ctx, posada.slug);
  }, [modalidad, apartamentoId, reservasConfirmadas, posada.slug]);

  // Si el cliente cambia modalidad/apto y el rango actual choca → limpiar
  // Usamos un ref para acceder al rango actual sin disparar el effect en cada render
  const rangoRef = useRef(rango);
  rangoRef.current = rango;
  useEffect(() => {
    const r = rangoRef.current;
    if (r?.from && r?.to) {
      const inicio = format(r.from, 'yyyy-MM-dd');
      const fin = format(r.to, 'yyyy-MM-dd');
      if (rangoChocaConOcupadas(inicio, fin, fechasOcupadas)) {
        setRango(undefined);
        setAvisoLimpieza('Las fechas que tenías elegidas chocan con esta nueva opción. Por favor vuelve a seleccionar.');
        setTimeout(() => setAvisoLimpieza(null), 6000);
      }
    }
  }, [fechasOcupadas]);

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
      <input type="hidden" name="fecha_inicio" value={fechaInicio} />
      <input type="hidden" name="fecha_fin" value={fechaFin} />

      {/* Columna izquierda */}
      <div className="space-y-5">
        {/* Fechas con calendario visual */}
        <Section icon={<CalendarDays className="w-5 h-5" />} titulo="Fechas">
          <p className="text-sm text-[var(--foreground-muted)] mb-3">
            Selecciona el día de llegada y luego el día de salida. Las fechas en{' '}
            <span className="text-[var(--danger)] font-medium">rojo tachado</span> ya están ocupadas.
          </p>

          <div className="bg-white border border-[var(--border)] rounded-xl p-3 sm:p-4 inline-block w-full overflow-x-auto">
            <DayPicker
              mode="range"
              selected={rango}
              onSelect={setRango}
              disabled={[
                { before: addDays(startOfToday(), 1) }, // no hoy ni atrás (llegada mínimo mañana)
                ...fechasOcupadas.map((d) => ({ from: d, to: d })),
              ]}
              numberOfMonths={numMeses}
              startMonth={new Date()}
              locale={es}
              showOutsideDays={false}
            />
          </div>

          {/* Resumen del rango elegido */}
          {fechaInicio && fechaFin && (
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--foreground)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
              <span>
                <strong>{formatoFechaCorta(fechaInicio)}</strong> (check-in 2:00 PM) →{' '}
                <strong>{formatoFechaCorta(fechaFin)}</strong> (check-out 12:00 m)
              </span>
            </div>
          )}

          {avisoLimpieza && (
            <div className="mt-3 p-3 bg-[var(--warning-light)] border border-[var(--warning)]/30 rounded-lg text-sm text-[var(--warning)] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{avisoLimpieza}</span>
            </div>
          )}
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
            <p className="text-xs text-[var(--foreground-subtle)] mt-2">
              Al cambiar de apartamento, el calendario se actualiza con las fechas ocupadas de ese apto.
            </p>
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
              <p className="text-sm">Elige fechas en el calendario para ver el precio.</p>
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

        {/* Mini-leyenda del calendario */}
        <div className="mt-4 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl p-4 text-xs text-[var(--foreground-muted)] space-y-1.5">
          <p className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-[var(--danger)]" />
            <span>Días tachados = ya reservados</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded bg-[var(--primary)]" />
            <span>Días en azul = tu rango seleccionado</span>
          </p>
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
