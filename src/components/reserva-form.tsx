'use client';

import { useActionState, useMemo, useState } from 'react';
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

// En Beach baja hay 3 tarifas según num_personas. En altas el precio es plano.
const OPCIONES_BEACH = [12, 16, 20];

export function ReservaForm({ posada, apartamentos, temporadas, precios }: Props) {
  // ---- Estado controlado (para el cálculo en vivo) ----
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

  // ---- Server Action ----
  const [estadoEnvio, formAction, enviando] = useActionState<EstadoEnvio | null, FormData>(
    enviarReserva,
    null,
  );

  // ---- Cálculo de precio en vivo ----
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
    <form
      action={formAction}
      className="grid lg:grid-cols-[1fr_360px] gap-8"
    >
      {/* Hidden fields para que la Server Action reciba todo */}
      <input type="hidden" name="posada_slug" value={posada.slug} />

      {/* Columna izquierda: campos */}
      <div className="space-y-6">
        {/* Fechas */}
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Fechas</legend>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-[var(--muted)]">Llegada (check-in 2pm)</span>
              <input
                type="date"
                name="fecha_inicio"
                value={fechaInicio}
                min={hoyISO()}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
              />
            </label>
            <label className="block">
              <span className="text-sm text-[var(--muted)]">Salida (check-out 12m)</span>
              <input
                type="date"
                name="fecha_fin"
                value={fechaFin}
                min={fechaInicio || hoyISO()}
                onChange={(e) => setFechaFin(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
              />
            </label>
          </div>
        </fieldset>

        {/* Modalidad (Confort) */}
        {posada.tipo_alquiler === 'individual_y_completa' ? (
          <fieldset className="space-y-2">
            <legend className="text-lg font-semibold">¿Cómo quieres reservar?</legend>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--background)]">
                <input
                  type="radio"
                  name="modalidad"
                  value="apartamento"
                  checked={modalidad === 'apartamento'}
                  onChange={() => setModalidad('apartamento')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Un apartamento individual</p>
                  <p className="text-sm text-[var(--muted)]">
                    Ideal para grupos de hasta 7 personas. No disponible en diciembre ni Semana Santa.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--background)]">
                <input
                  type="radio"
                  name="modalidad"
                  value="completa"
                  checked={modalidad === 'completa'}
                  onChange={() => setModalidad('completa')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Posada completa (4 apartamentos)</p>
                  <p className="text-sm text-[var(--muted)]">
                    Para grupos grandes — hasta 28 personas. Único disponible en diciembre y Semana Santa.
                  </p>
                </div>
              </label>
            </div>
          </fieldset>
        ) : (
          <input type="hidden" name="modalidad" value="completa" />
        )}

        {/* Apartamento */}
        {modalidad === 'apartamento' ? (
          <fieldset>
            <label className="block">
              <span className="text-lg font-semibold">Apartamento</span>
              <select
                name="apartamento_id"
                value={apartamentoId}
                onChange={(e) => setApartamentoId(e.target.value)}
                required
                className="mt-2 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
              >
                {apartamentos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                    {a.caracteristica ? ` — ${a.caracteristica}` : ''}
                    {a.capacidad ? ` (hasta ${a.capacidad} pers)` : ''}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        ) : (
          <input type="hidden" name="apartamento_id" value="" />
        )}

        {/* Número de personas */}
        <fieldset>
          <label className="block">
            <span className="text-lg font-semibold">Número de personas</span>
            {posada.slug === 'beach' ? (
              <select
                name="num_personas"
                value={numPersonas}
                onChange={(e) => setNumPersonas(Number(e.target.value))}
                className="mt-2 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
              >
                {OPCIONES_BEACH.map((n) => (
                  <option key={n} value={n}>
                    {n} personas
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                name="num_personas"
                min={1}
                max={modalidad === 'completa' ? 28 : 7}
                value={numPersonas}
                onChange={(e) => setNumPersonas(Number(e.target.value))}
                className="mt-2 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
              />
            )}
          </label>
          {posada.slug === 'beach' && (
            <p className="text-xs text-[var(--muted)] mt-1">
              En baja el precio varía con el grupo. En temporadas altas es plano.
            </p>
          )}
        </fieldset>

        {/* Datos del cliente */}
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Tus datos</legend>
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Nombre completo</span>
            <input
              type="text"
              name="cliente_nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-[var(--muted)]">Teléfono / WhatsApp</span>
              <input
                type="tel"
                name="cliente_telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+58 ..."
                required
                className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
              />
            </label>
            <label className="block">
              <span className="text-sm text-[var(--muted)]">Email</span>
              <input
                type="email"
                name="cliente_email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Notas (opcional)</span>
            <textarea
              name="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-md bg-white"
            />
          </label>
        </fieldset>

        {/* Comprobante de pago (OBLIGATORIO) */}
        <fieldset className="space-y-2 p-4 border-2 border-amber-300 bg-amber-50 rounded-md">
          <legend className="text-lg font-semibold flex items-center gap-2 px-2">
            <span>📎</span> Comprobante de pago
          </legend>
          <p className="text-sm text-amber-900">
            <strong>Obligatorio.</strong> Para enviar la solicitud, sube una imagen
            o PDF del comprobante de transferencia / depósito. Sin esto no
            podemos procesar tu reserva.
          </p>
          <input
            type="file"
            name="comprobante"
            accept="image/*,.pdf"
            onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
            required
            className="w-full text-sm"
          />
          {comprobante && (
            <p className="text-xs text-[var(--muted)]">
              ✓ {comprobante.name} ({Math.round(comprobante.size / 1024)} KB)
            </p>
          )}
        </fieldset>

        {/* Error del servidor */}
        {estadoEnvio?.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            ⚠ {estadoEnvio.error}
          </div>
        )}

        <button
          type="submit"
          disabled={!puedeEnviar || enviando}
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-md transition-colors"
        >
          {enviando ? 'Enviando…' : 'Enviar solicitud de reserva'}
        </button>
      </div>

      {/* Columna derecha: resumen pegajoso */}
      <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Resumen</h3>

          {!resultado && (
            <p className="text-sm text-[var(--muted)]">
              Elige fechas para ver el precio calculado.
            </p>
          )}

          {resultado && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Llegada</span>
                <span>{formatoFechaCorta(fechaInicio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Salida</span>
                <span>{formatoFechaCorta(fechaFin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Noches</span>
                <span>{resultado.cantidad_noches}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Modalidad</span>
                <span className="capitalize">{modalidad}</span>
              </div>

              {resultado.temporadas_aplicadas.length > 0 && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-1">Temporadas:</p>
                  {resultado.temporadas_aplicadas.map((t) => (
                    <p key={t.id} className="text-xs">
                      {t.nombre}: {t.cantidad_noches} noche{t.cantidad_noches !== 1 ? 's' : ''}
                    </p>
                  ))}
                </div>
              )}

              {resultado.advertencias.length > 0 && (
                <div className="pt-3 border-t border-[var(--border)]">
                  {resultado.advertencias.map((a, i) => (
                    <p key={i} className="text-xs text-red-700">
                      ⚠ {a}
                    </p>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-[var(--border)]">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-[var(--primary)]">
                    {formatoUSD(resultado.total_usd)}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">USD</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--muted)] px-2">
          Al enviar, tu reserva queda <strong>pendiente</strong>. La confirmamos
          manualmente tras verificar el comprobante de pago.
        </p>
      </aside>
    </form>
  );
}
