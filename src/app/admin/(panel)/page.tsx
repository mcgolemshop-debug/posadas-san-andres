import Link from 'next/link';
import {
  CalendarCheck2,
  CheckCircle2,
  TrendingUp,
  CalendarRange,
  Receipt,
  Users2,
  Building2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const sesion = await getSesionAdminEstricto();
  const supabase = await createClient();

  const [pendientesRes, confirmadasMesRes, totalMesRes] = await Promise.all([
    supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'confirmada')
      .gte('confirmada_at', primerDiaMes()),
    supabase
      .from('reservas')
      .select('total_usd')
      .eq('estado', 'confirmada')
      .gte('confirmada_at', primerDiaMes()),
  ]);

  const ingresoMes = (totalMesRes.data ?? []).reduce((s, r) => s + Number(r.total_usd ?? 0), 0);

  const verIngreso = sesion.perfil.rol === 'dueno' || sesion.perfil.rol === 'contador';

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Saludo */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-1.5">
          Panel administrativo
        </p>
        <h1 className="font-display text-3xl sm:text-4xl mb-1">
          Hola, {primerNombre(sesion.perfil.nombre)} <Sparkles className="inline w-6 h-6 text-[var(--accent)]" />
        </h1>
        <p className="text-[var(--foreground-muted)]">
          {textoRol(sesion.perfil.rol)}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metrica
          titulo="Reservas pendientes"
          valor={String(pendientesRes.count ?? 0)}
          subtitulo="Esperan verificación"
          href="/admin/reservas?estado=pendiente"
          icon={<CalendarCheck2 className="w-5 h-5" />}
          color="from-[var(--warning)] to-orange-600"
          accentBg="bg-[var(--warning-light)]"
        />
        <Metrica
          titulo="Confirmadas este mes"
          valor={String(confirmadasMesRes.count ?? 0)}
          subtitulo="Desde el día 1"
          href="/admin/reservas?estado=confirmada"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="from-[var(--success)] to-emerald-600"
          accentBg="bg-[var(--success-light)]"
        />
        {verIngreso ? (
          <Metrica
            titulo="Ingreso bruto del mes"
            valor={formatoUSD(ingresoMes)}
            subtitulo="Solo confirmadas"
            href="/admin/reportes"
            icon={<TrendingUp className="w-5 h-5" />}
            color="from-[var(--primary)] to-[var(--secondary)]"
            accentBg="bg-[var(--primary-light)]"
          />
        ) : (
          <Metrica
            titulo="Calendario"
            valor="📅"
            subtitulo="Ver ocupación"
            href="/admin/calendario"
            icon={<CalendarRange className="w-5 h-5" />}
            color="from-[var(--secondary)] to-cyan-600"
            accentBg="bg-[var(--secondary-light)]"
          />
        )}
      </div>

      {/* Módulos */}
      <div>
        <h2 className="font-display text-2xl mb-4">¿Qué quieres hacer?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardModulo
            href="/admin/reservas"
            icon={<CalendarCheck2 className="w-5 h-5" />}
            titulo="Ver reservas"
            desc={
              sesion.perfil.rol === 'conserje' ? 'Reservas de tu posada.'
                : sesion.perfil.rol === 'vulcanos' ? 'Todas las reservas, gestionas las tuyas.'
                : 'Todas las reservas con filtros.'
            }
          />
          <CardModulo
            href="/admin/calendario"
            icon={<CalendarRange className="w-5 h-5" />}
            titulo="Calendario"
            desc="Vista mensual de qué fechas están bloqueadas."
          />
          {sesion.perfil.rol === 'vulcanos' && (
            <>
              <CardModulo
                href="/posada/confort/reservar"
                icon={<CalendarCheck2 className="w-5 h-5" />}
                titulo="Crear reserva Confort"
                desc="Crea una reserva nueva para Confort. Luego la 'tomas' como gestora desde el detalle para ganar comisión."
              />
              <CardModulo
                href="/posada/beach/reservar"
                icon={<CalendarCheck2 className="w-5 h-5" />}
                titulo="Crear reserva Beach"
                desc="Crea una reserva nueva para Beach. Luego la 'tomas' como gestora desde el detalle para ganar comisión."
              />
            </>
          )}
          {['dueno', 'conserje', 'contador'].includes(sesion.perfil.rol) && (
            <CardModulo
              href="/admin/gastos"
              icon={<Receipt className="w-5 h-5" />}
              titulo="Gastos"
              desc="Registrar y consultar gastos operativos."
            />
          )}
          {sesion.perfil.rol === 'dueno' && (
            <>
              <CardModulo
                href="/admin/usuarios"
                icon={<Users2 className="w-5 h-5" />}
                titulo="Usuarios"
                desc="Crear / desactivar conserjes y socios."
              />
              <CardModulo
                href="/admin/posadas"
                icon={<Building2 className="w-5 h-5" />}
                titulo="Posadas y precios"
                desc="Editar nombres, temporadas, tarifas."
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------- componentes ------------- */

function Metrica({
  titulo, valor, subtitulo, href, icon, color, accentBg,
}: {
  titulo: string; valor: string; subtitulo: string; href: string;
  icon: React.ReactNode; color: string; accentBg: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden"
    >
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${color} opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />
      <div className="relative flex items-start justify-between mb-3">
        <span className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center text-[var(--primary)]`}>
          {icon}
        </span>
        <ArrowUpRight className="w-4 h-4 text-[var(--foreground-subtle)] group-hover:text-[var(--primary)] transition-colors" />
      </div>
      <p className="text-xs uppercase tracking-widest text-[var(--foreground-muted)] mb-1">{titulo}</p>
      <p className="font-display text-3xl text-[var(--primary)] mb-0.5">{valor}</p>
      <p className="text-xs text-[var(--foreground-subtle)]">{subtitulo}</p>
    </Link>
  );
}

function CardModulo({ href, icon, titulo, desc }: { href: string; icon: React.ReactNode; titulo: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex gap-4 p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)]/40 hover:shadow-md transition-all"
    >
      <span className="w-11 h-11 shrink-0 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{titulo}</p>
        <p className="text-sm text-[var(--foreground-muted)] mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

function primerNombre(completo: string): string {
  return completo.split(' ')[0] ?? completo;
}
function primerDiaMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function textoRol(rol: string): string {
  switch (rol) {
    case 'dueno': return 'Tienes acceso total al panel.';
    case 'conserje': return 'Ves la operación de tu posada asignada.';
    case 'vulcanos': return 'Ves y gestionas las reservas que trajiste.';
    case 'contador': return 'Acceso de solo lectura a finanzas y reservas.';
    default: return '';
  }
}
