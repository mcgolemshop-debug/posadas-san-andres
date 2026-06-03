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
  // Multi-apto: array de IDs seleccionados (Confort modalidad=apartamento)
  const [aptosSeleccionados, setAptosSeleccionados] = useState<string[]>(
    apartamentos[0] ? [apartamentos[0].id] : [],
  );
  const [numPersonas, setNumPersonas] = useState<number>(posada.slug === 'beach' ? 12 : 4);

  // Capacidad incluida según selección actual
  const capacidadIncluida = (() => {
    if (posada.slug === 'beach') return numPersonas; // 12/16/20 que el cliente eligió
    if (modalidad === 'completa') return 28;
    // Modalidad apartamento: sumar capacidades de los aptos seleccionados
    return aptosSeleccionados.reduce((sum, id) => {
      const a = apartamentos.find((x) => x.id === id);
      return sum + (a?.capacidad ?? 7);
    }, 0);
  })();

  // Personas extras = max(0, num_personas - capacidad)
  const numPersonasExtras = Math.max(0, numPersonas - capacidadIncluida);
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

  // Fechas deshabilitadas: si modalidad=apartamento con N aptos seleccionados,
  // bloqueamos las fechas ocupadas por CUALQUIERA de ellos.
  const fechasOcupadas = useMemo(() => {
    if (modalidad === 'completa') {
      const ctx = { modalidad: 'completa', apartamentoId: null } as const;
      return fechasOcupadasParaContexto(reservasConfirmadas, ctx, posada.slug);
    }
    // Unir fechas ocupadas de todos los aptos seleccionados
    const todas: Date[] = [];
    const yaIncluidas = new Set<number>();
    for (const aptoId of aptosSeleccionados) {
      const ctx = { modalidad: 'apartamento', apartamentoId: aptoId } as const;
      const ocupadas = fechasOcupadasParaContexto(reservasConfirmadas, ctx, posada.slug);
      for (const d of ocupadas) {
        if (!yaIncluidas.has(d.getTime())) {
          yaIncluidas.add(d.getTime());
          todas.push(d);
        }
      }
    }
    return todas;
  }, [modalidad, aptosSeleccionados, reservasConfirmadas, posada.slug]);

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

  // Scroll automático al banner de error cuando aparece, útil en móvil
  // donde el error puede quedar fuera de la pantalla.
  useEffect(() => {
    if (estadoEnvio?.error) {
      // Pequeño delay para que el DOM renderice el banner antes de scrollear
      const t = setTimeout(() => {
        const el = document.getElementById('reserva-form-error');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [estadoEnvio?.error]);

  const cantidadApartamentos = modalidad === 'apartamento' ? aptosSeleccionados.length : 1;

  const resultado = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    return calcularPrecioReserva({
      posada_slug: posada.slug,
      posada_id: posada.id,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      modalidad,
      num_personas: numPersonas,
      cantidad_apartamentos: cantidadApartamentos,
      num_personas_extras: numPersonasExtras,
      temporadas,
      precios,
    });
  }, [fechaInicio, fechaFin, modalidad, numPersonas, cantidadApartamentos, numPersonasExtras, posada, temporadas, precios]);

  const puedeEnviar =
    !!resultado &&
    !resultado.tiene_errores &&
    resultado.cumple_estadia_minima &&
    resultado.total_usd > 0 &&
    nombre.trim().length > 0 &&
    telefono.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email) &&
    comprobante !== null &&
    (modalidad === 'completa' || aptosSeleccionados.length > 0);

  return (
    <form action={formAction} className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
      <input type="hidden" name="posada_slug" value={posada.slug} />
      <input type="hidden" name="fecha_inicio" value={fechaInicio} />
      <input type="hidden" name="fecha_fin" value={fechaFin} />
      <input type="hidden" name="num_personas_extras" value={numPersonasExtras} />

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
              modifiers={{
                /* Reservas confirmadas — solo estas se ven en rojo tachado */
                ocupado: fechasOcupadas,
              }}
              modifiersClassNames={{
                ocupado: 'rdp-ocupado',
              }}
              disabled={[
                { before: addDays(startOfToday(), 1) }, // no hoy ni atrás
                ...fechasOcupadas.map((d) => ({ from: d, to: d })),
              ]}
              numberOfMonths={numMeses}
              startMonth={new Date()}
              locale={es}
              showOutsideDays={false}
            />
          </div>

          {/* Leyenda explícita debajo del calendario */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--foreground-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--danger-light)] border border-[var(--danger)]/40 text-[var(--danger)] font-bold text-[10px]">×</span>
              <span><strong className="text-[var(--danger)]">Ocupado</strong> (ya reservado)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-400 text-[10px]">−</span>
              <span>Días pasados</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-[var(--border-strong)] text-[var(--foreground)] font-medium text-[10px]">●</span>
              <span><strong>Disponible</strong></span>
            </span>
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
          <Section icon={<Bed className="w-5 h-5" />} titulo="¿Cuáles apartamentos?">
            <p className="text-sm text-[var(--foreground-muted)] mb-3">
              Selecciona uno o varios. Cada apto reserva 7 personas. Los precios se suman.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {apartamentos.map((a) => {
                const seleccionado = aptosSeleccionados.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      seleccionado
                        ? 'border-[var(--primary)] bg-[var(--primary-light)]/40'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => {
                        setAptosSeleccionados((prev) =>
                          seleccionado ? prev.filter((id) => id !== a.id) : [...prev, a.id],
                        );
                      }}
                      className="mt-1 accent-[var(--primary)]"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-[var(--foreground)]">{a.nombre}</p>
                      <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                        {a.caracteristica && <span>{a.caracteristica} · </span>}
                        Hasta {a.capacidad ?? 7} pers
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            {aptosSeleccionados.length === 0 && (
              <p className="text-xs text-[var(--danger)] mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Selecciona al menos un apartamento.
              </p>
            )}
            {aptosSeleccionados.length > 1 && (
              <p className="text-xs text-[var(--success)] mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {aptosSeleccionados.length} apartamentos seleccionados, hasta {capacidadIncluida} personas incluidas.
              </p>
            )}
            {/* Hidden inputs para enviar la lista */}
            <input type="hidden" name="apartamento_id" value={aptosSeleccionados[0] ?? ''} />
            {aptosSeleccionados.map((id) => (
              <input key={id} type="hidden" name="apartamentos_ids" value={id} />
            ))}
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
            <>
              <input
                type="number"
                min={1} max={modalidad === 'completa' ? 28 : 7}
                value={numPersonas > 0 ? numPersonas : ''}
                placeholder="¿Cuántos vienen?"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    setNumPersonas(0); // permite que el campo se vea vacío al borrar
                  } else {
                    const n = Number(v);
                    if (!isNaN(n) && n >= 0) setNumPersonas(n);
                  }
                }}
                onBlur={(e) => {
                  // Si el campo quedó vacío, volver al mínimo
                  if (e.target.value === '' || Number(e.target.value) < 1) setNumPersonas(1);
                }}
                inputMode="numeric"
                className={inputClass}
              />
              {/* Hidden con el name que SIEMPRE envía un valor válido (>=1).
                  Esto evita que en móvil, donde a veces el onBlur no dispara
                  antes del submit, el formulario falle por num_personas=0. */}
              <input type="hidden" name="num_personas" value={Math.max(1, numPersonas)} />
            </>
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
          <div
            id="reserva-form-error"
            role="alert"
            className="bg-[var(--danger-light)] border-2 border-[var(--danger)] rounded-xl p-4 flex gap-3 text-sm text-[var(--danger)] shadow-md animate-in"
          >
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">No pudimos enviar la reserva</p>
              <p className="text-[var(--foreground)]">{estadoEnvio.error}</p>
            </div>
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

              {/* Desglose */}
              <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                  <span>Subtotal {cantidadApartamentos > 1 ? `(${cantidadApartamentos} aptos)` : ''}</span>
                  <span>{formatoUSD(resultado.subtotal_usd)}</span>
                </div>
                {resultado.extras_personas_usd > 0 && (
                  <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                    <span>+ {numPersonasExtras} {numPersonasExtras === 1 ? 'persona extra' : 'personas extras'}</span>
                    <span>{formatoUSD(resultado.extras_personas_usd)}</span>
                  </div>
                )}
                {resultado.servicio_extra_usd > 0 && (
                  <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                    <span>+ Servicio extra</span>
                    <span>{formatoUSD(resultado.servicio_extra_usd)}</span>
                  </div>
                )}
                {resultado.descuento_usd > 0 && (
                  <div className="flex justify-between text-xs text-[var(--success)]">
                    <span>− Descuento</span>
                    <span>−{formatoUSD(resultado.descuento_usd)}</span>
                  </div>
                )}
              </div>

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
