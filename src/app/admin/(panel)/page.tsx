import Link from 'next/link';
import { getSesionAdminEstricto } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { formatoUSD } from '@/lib/formato';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const sesion = await getSesionAdminEstricto();
  const supabase = await createClient();

  // Métricas — RLS filtra automáticamente según rol
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

  const ingresoMes =
    (totalMesRes.data ?? []).reduce((s, r) => s + Number(r.total_usd ?? 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-1">
          Hola, {primerNombre(sesion.perfil.nombre)} 👋
        </h1>
        <p className="text-[var(--muted)]">
          {textoRol(sesion.perfil.rol)}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Metrica
          titulo="Reservas pendientes"
          valor={String(pendientesRes.count ?? 0)}
          subtitulo="Esperan verificación"
          href="/admin/reservas?estado=pendiente"
        />
        <Metrica
          titulo="Confirmadas este mes"
          valor={String(confirmadasMesRes.count ?? 0)}
          subtitulo="Desde el día 1"
          href="/admin/reservas?estado=confirmada"
        />
        {sesion.perfil.rol === 'dueno' || sesion.perfil.rol === 'contador' ? (
          <Metrica
            titulo="Ingreso bruto del mes"
            valor={formatoUSD(ingresoMes)}
            subtitulo="Solo reservas confirmadas"
            href="/admin/reservas?estado=confirmada"
          />
        ) : (
          <Metrica
            titulo="Calendario"
            valor="📅"
            subtitulo="Ver ocupación"
            href="/admin/calendario"
          />
        )}
      </div>

      {/* Tarjetas de módulos */}
      <h2 className="text-xl font-semibold mb-3">¿Qué quieres hacer?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardModulo
          titulo="Ver reservas"
          desc={
            sesion.perfil.rol === 'conserje'
              ? 'Reservas de tu posada.'
              : sesion.perfil.rol === 'vulcanos'
                ? 'Solo las que tú gestionas.'
                : 'Todas las reservas con filtros.'
          }
          href="/admin/reservas"
        />
        <CardModulo
          titulo="Calendario de ocupación"
          desc="Vista mensual de qué fechas están bloqueadas."
          href="/admin/calendario"
        />
        {sesion.perfil.rol === 'dueno' && (
          <>
            <CardModulo
              titulo="Usuarios"
              desc="Crear / desactivar conserjes y socios."
              href="/admin/usuarios"
            />
            <CardModulo
              titulo="Posadas y precios"
              desc="Editar apartamentos, temporadas y tarifas."
              href="/admin/posadas"
            />
          </>
        )}
      </div>
    </div>
  );
}

function Metrica({
  titulo, valor, subtitulo, href,
}: { titulo: string; valor: string; subtitulo: string; href: string }) {
  return (
    <Link
      href={href}
      className="block p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:shadow-md transition-shadow"
    >
      <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">{titulo}</p>
      <p className="text-3xl font-bold text-[var(--primary)] mb-1">{valor}</p>
      <p className="text-xs text-[var(--muted)]">{subtitulo}</p>
    </Link>
  );
}

function CardModulo({
  titulo, desc, href,
}: { titulo: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group"
    >
      <p className="font-semibold mb-1 group-hover:text-[var(--primary)]">{titulo}</p>
      <p className="text-sm text-[var(--muted)]">{desc}</p>
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
    case 'dueno': return 'Tienes acceso total al panel administrativo.';
    case 'conserje': return 'Ves la operación de tu posada asignada.';
    case 'vulcanos': return 'Ves y gestionas las reservas que trajiste.';
    case 'contador': return 'Acceso de solo lectura a finanzas y reservas.';
    default: return '';
  }
}
