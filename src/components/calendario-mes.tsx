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

export function CalendarioMes({ mes, posadaNombre, filas, reservas, esCompleta }: Props) {
  const [anyo, mesNum] = mes.split('-').map(Number);
  const diasEnMes = new Date(anyo, mesNum, 0).getDate();
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);

  // Pre-calcular cobertura por (filaId, dia)
  const cobertura = new Map<string, ReservaCalendar>();
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
  }

  // Hoy para resaltar
  const hoyISO = new Date().toISOString().slice(0, 10);
  const esHoy = (dia: number) => {
    const fechaISO = `${anyo}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return fechaISO === hoyISO;
  };

  // Color por reserva (consistente: hash simple del id → uno de 6 colores)
  const colorPara = (id: string) => {
    const colores = ['bg-emerald-300', 'bg-sky-300', 'bg-violet-300', 'bg-rose-300', 'bg-amber-300', 'bg-indigo-300'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return colores[hash % colores.length];
  };

  return (
    <div>
      <h2 className="font-semibold text-lg mb-3">{posadaNombre}</h2>
      <div className="overflow-x-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-[var(--surface)] z-10">
                Apto / Día
              </th>
              {dias.map((d) => (
                <th
                  key={d}
                  className={`px-1 py-2 font-normal text-center min-w-[28px] ${
                    esHoy(d) ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-semibold' : ''
                  }`}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-medium sticky left-0 bg-[var(--surface)] z-10">
                  {f.nombre}
                </td>
                {dias.map((d) => {
                  const r = cobertura.get(`${f.id}:${d}`);
                  if (!r) {
                    return <td key={d} className="border-l border-[var(--border)] p-0 h-10" />;
                  }
                  return (
                    <td
                      key={d}
                      className={`border-l border-white p-0 h-10 ${colorPara(r.id)} relative`}
                    >
                      <Link
                        href={`/admin/reservas/${r.id}`}
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white truncate hover:bg-black/10"
                        title={`${r.cliente_nombre} · ${r.fecha_inicio} → ${r.fecha_fin}${r.modalidad === 'completa' ? ' (completa)' : ''}`}
                      >
                        {d === Number(r.fecha_inicio.slice(8, 10)) ||
                        (d === 1 && r.fecha_inicio < `${anyo}-${String(mesNum).padStart(2, '0')}-01`)
                          ? r.cliente_nombre.split(' ')[0].slice(0, 8)
                          : ''}
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
