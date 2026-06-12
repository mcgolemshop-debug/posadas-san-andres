import Link from 'next/link';

interface ReservaCalendar {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  cliente_nombre: string;
  modalidad: 'apartamento' | 'completa';
  apartamento_id: string | null;
}

interface AptoCalendar {
  id: string;
  nombre: string;
}

interface Props {
  /** YYYY-MM */
  mes: string;
  posadaNombre: string;
  /** Lista de filas (apartamentos). Para Beach pasamos un único "fila" con id de posada. */
  filas: AptoCalendar[];
  reservas: ReservaCalendar[];
  /** En Confort, las reservas "completa" llenan todas las filas. */
  esCompleta: (r: ReservaCalendar) => boolean;
}

const INICIALES_DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Dom, Lun, Mar, Mié, Jue, Vie, Sáb
const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function CalendarioMes({ mes, posadaNombre, filas, reservas, esCompleta }: Props) {
  const [anyo, mesNum] = mes.split('-').map(Number);
  const diasEnMes = new Date(anyo, mesNum, 0).getDate();
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);

  // Pre-calcular cobertura por (filaId, dia): días "plenos" donde el huésped
  // ocupa la noche entera (incluye fecha_inicio, excluye fecha_fin).
  const cobertura = new Map<string, ReservaCalendar>();
  // Mapa adicional: día de check-OUT (= fecha_fin) por (filaId, dia). La mañana
  // está ocupada hasta las 12 m, pero la tarde es libre.
  const checkOuts = new Map<string, ReservaCalendar>();
  for (const r of reservas) {
    const inicio = new Date(r.fecha_inicio + 'T12:00:00Z');
    const fin = new Date(r.fecha_fin + 'T12:00:00Z');
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(anyo, mesNum - 1, dia, 12, 0, 0);
      if (fecha >= inicio && fecha < fin) {
        if (esCompleta(r)) {
          for (const f of filas) cobertura.set(`${f.id}:${dia}`, r);
        } else if (r.apartamento_id) {
          cobertura.set(`${r.apartamento_id}:${dia}`, r);
        }
      }
    }
    // Check-out: solo si fecha_fin cae dentro del mes visible
    if (fin.getUTCFullYear() === anyo && fin.getUTCMonth() + 1 === mesNum) {
      const dia = fin.getUTCDate();
      if (esCompleta(r)) {
        for (const f of filas) checkOuts.set(`${f.id}:${dia}`, r);
      } else if (r.apartamento_id) {
        checkOuts.set(`${r.apartamento_id}:${dia}`, r);
      }
    }
  }

  // Helper: día de la semana para una fecha (0=Domingo, 6=Sábado)
  const diaSemana = (dia: number): number => {
    return new Date(anyo, mesNum - 1, dia).getDay();
  };

  // Hoy para resaltar
  const hoyISO = new Date().toISOString().slice(0, 10);
  const esHoy = (dia: number) => {
    const fechaISO = `${anyo}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return fechaISO === hoyISO;
  };

  // Color por reserva (consistente: hash simple del id → uno de 6 colores nice)
  const colorPara = (id: string) => {
    const palette = [
      'bg-gradient-to-br from-emerald-400 to-emerald-500',
      'bg-gradient-to-br from-sky-400 to-cyan-500',
      'bg-gradient-to-br from-violet-400 to-purple-500',
      'bg-gradient-to-br from-rose-400 to-pink-500',
      'bg-gradient-to-br from-amber-400 to-orange-500',
      'bg-gradient-to-br from-indigo-400 to-blue-500',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  };

  // Versión hex del color de la reserva — necesario para los gradients inline
  // que usamos en celdas de check-in/check-out (mitad/mitad).
  const colorHexPara = (id: string) => {
    const palette = ['#10b981', '#06b6d4', '#8b5cf6', '#f43f5e', '#fb923c', '#3b82f6'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  };

  return (
    <div>
      <h2 className="font-display text-2xl mb-4 text-[var(--foreground)]">{posadaNombre}</h2>
      <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
        <table className="min-w-full text-xs border-separate border-spacing-0">
          <thead>
            {/* Fila 1: iniciales de día de la semana */}
            <tr className="bg-[var(--surface-elevated)]">
              <th
                rowSpan={2}
                className="text-left px-4 py-3 font-semibold sticky left-0 bg-[var(--surface-elevated)] z-10 border-b-2 border-[var(--border)] text-[var(--foreground)] min-w-[120px]"
              >
                Apartamento
              </th>
              {dias.map((d) => {
                const ds = diaSemana(d);
                const esFinDeSemana = ds === 0 || ds === 6;
                return (
                  <th
                    key={`dow-${d}`}
                    className={`px-0.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider min-w-[32px] border-b border-[var(--border-subtle)] ${
                      esFinDeSemana
                        ? 'bg-[var(--accent-light)] text-[var(--accent-hover)]'
                        : 'text-[var(--foreground-subtle)]'
                    } ${esHoy(d) ? 'bg-[var(--primary-light)] text-[var(--primary)]' : ''}`}
                    title={NOMBRES_DIAS[ds]}
                  >
                    {INICIALES_DIAS[ds]}
                  </th>
                );
              })}
            </tr>
            {/* Fila 2: número del día */}
            <tr className="bg-[var(--surface-elevated)]">
              {dias.map((d) => {
                const ds = diaSemana(d);
                const esFinDeSemana = ds === 0 || ds === 6;
                return (
                  <th
                    key={`dn-${d}`}
                    className={`px-0.5 pb-2.5 pt-0 text-center text-[12px] font-semibold min-w-[32px] border-b-2 border-[var(--border)] ${
                      esHoy(d)
                        ? 'bg-[var(--primary)] text-white rounded-t-md'
                        : esFinDeSemana
                          ? 'text-[var(--accent-hover)]'
                          : 'text-[var(--foreground)]'
                    }`}
                  >
                    {d}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, fi) => (
              <tr key={f.id} className={fi % 2 === 0 ? '' : 'bg-[var(--surface-elevated)]/30'}>
                <td className="px-4 py-3 font-medium sticky left-0 bg-inherit z-10 border-r border-[var(--border-subtle)] text-[var(--foreground)] min-w-[120px]">
                  {f.nombre}
                </td>
                {dias.map((d) => {
                  const r = cobertura.get(`${f.id}:${d}`);
                  const ckOut = checkOuts.get(`${f.id}:${d}`);
                  const ds = diaSemana(d);
                  const esFinDeSemana = ds === 0 || ds === 6;

                  // CASO 1: celda totalmente libre (puede ser check-out solo si ckOut está)
                  if (!r) {
                    if (ckOut) {
                      // Solo check-out: mitad superior-izquierda con color del huésped que sale,
                      // mitad inferior-derecha libre.
                      const colorHex = colorHexPara(ckOut.id);
                      return (
                        <td
                          key={d}
                          className={`p-0 h-12 border-b border-[var(--border-subtle)] relative group ${
                            esHoy(d) ? 'border-l-2 border-r-2 border-[var(--primary)]/30' : ''
                          }`}
                        >
                          <Link
                            href={`/admin/reservas/${ckOut.id}`}
                            className="absolute inset-0 hover:brightness-95"
                            style={{ background: `linear-gradient(90deg, ${colorHex} 0% 50%, transparent 50% 100%)` }}
                            title={`${ckOut.cliente_nombre} sale ${ckOut.fecha_fin} a 12 m`}
                          />
                        </td>
                      );
                    }
                    return (
                      <td
                        key={d}
                        className={`p-0 h-12 border-b border-[var(--border-subtle)] ${
                          esFinDeSemana ? 'bg-[var(--accent-light)]/30' : ''
                        } ${esHoy(d) ? 'border-l-2 border-r-2 border-[var(--primary)]/30' : ''}`}
                      />
                    );
                  }

                  const inicioEsHoy = d === Number(r.fecha_inicio.slice(8, 10));
                  const esPrimerDiaVisible = inicioEsHoy ||
                    (d === 1 && r.fecha_inicio < `${anyo}-${String(mesNum).padStart(2, '0')}-01`);

                  // CASO 2: check-in + check-out back-to-back en la MISMA fila
                  // (alguien sale a 12 m y otro entra a 2 PM ese mismo día)
                  if (inicioEsHoy && ckOut && ckOut.id !== r.id) {
                    const colorIn = colorHexPara(r.id);
                    const colorOut = colorHexPara(ckOut.id);
                    return (
                      <td key={d} className="p-0 h-12 relative group">
                        <Link
                          href={`/admin/reservas/${ckOut.id}`}
                          className="absolute inset-0 hover:brightness-95"
                          style={{ background: `linear-gradient(90deg, ${colorOut} 0% 50%, transparent 50% 100%)` }}
                          title={`${ckOut.cliente_nombre} sale ${ckOut.fecha_fin} a 12 m`}
                        />
                        <Link
                          href={`/admin/reservas/${r.id}`}
                          className="absolute inset-0 hover:brightness-95 flex items-end justify-end pr-1 pb-0.5"
                          style={{ background: `linear-gradient(90deg, transparent 0% 50%, ${colorIn} 50% 100%)` }}
                          title={`${r.cliente_nombre} entra ${r.fecha_inicio} a 2 PM`}
                        >
                          <span className="text-[9px] font-semibold text-white">
                            {r.cliente_nombre.split(' ')[0].slice(0, 5)}
                          </span>
                        </Link>
                      </td>
                    );
                  }

                  // CASO 3: solo check-in (primer día visible de la reserva)
                  if (inicioEsHoy) {
                    const colorHex = colorHexPara(r.id);
                    return (
                      <td key={d} className="p-0 h-12 relative group">
                        <Link
                          href={`/admin/reservas/${r.id}`}
                          className="absolute inset-0 hover:brightness-95 flex items-end justify-end pr-1 pb-0.5"
                          style={{ background: `linear-gradient(90deg, transparent 0% 50%, ${colorHex} 50% 100%)` }}
                          title={`${r.cliente_nombre} entra ${r.fecha_inicio} a 2 PM · sale ${r.fecha_fin}`}
                        >
                          <span className="text-[9px] font-semibold text-white">
                            {r.cliente_nombre.split(' ')[0].slice(0, 6)}
                          </span>
                        </Link>
                      </td>
                    );
                  }

                  // CASO 4: día pleno cubierto (noche intermedia)
                  return (
                    <td
                      key={d}
                      className={`p-0.5 h-12 ${colorPara(r.id)} relative group`}
                    >
                      <Link
                        href={`/admin/reservas/${r.id}`}
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white truncate px-0.5 hover:bg-black/15 transition-colors"
                        title={`${r.cliente_nombre} · ${r.fecha_inicio} → ${r.fecha_fin}${r.modalidad === 'completa' ? ' (posada completa)' : ''}`}
                      >
                        {esPrimerDiaVisible ? r.cliente_nombre.split(' ')[0].slice(0, 8) : ''}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
