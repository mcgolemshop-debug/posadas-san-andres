'use client';

import { usePathname } from 'next/navigation';
import { MapPin, Clock, Mail } from 'lucide-react';

/**
 * Footer rich con info de contacto. NO se muestra en /admin/*.
 */
export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="mt-20 bg-[var(--primary)] text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <p className="font-display text-2xl mb-2">
            Posadas <span className="italic text-[var(--accent)]">San Andrés</span>
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            Dos posadas frente al mar en Chichiriviche, estado Falcón.
            Tu próxima escapada caribeña.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-semibold text-white/90 uppercase tracking-widest text-xs mb-2">Contacto</p>
          <p className="flex items-center gap-2 text-white/80">
            <MapPin className="w-4 h-4 text-[var(--accent)]" />
            Chichiriviche, Falcón, Venezuela
          </p>
          <p className="flex items-center gap-2 text-white/80">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            Check-in 2:00 PM · Check-out 12:00 m
          </p>
          <p className="flex items-center gap-2 text-white/80">
            <Mail className="w-4 h-4 text-[var(--accent)]" />
            Te contactamos por email y WhatsApp
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-semibold text-white/90 uppercase tracking-widest text-xs mb-2">Reservar</p>
          <a href="/posada/confort" className="block text-white/80 hover:text-white transition-colors">
            → San Andrés Confort
          </a>
          <a href="/posada/beach" className="block text-white/80 hover:text-white transition-colors">
            → San Andrés Beach
          </a>
          <p className="text-xs text-white/50 pt-2">
            Cada reserva queda pendiente hasta verificar pago.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-xs text-white/50 flex flex-col sm:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} Posadas San Andrés. Todos los derechos reservados.</p>
          <p>Hecho con <span className="text-[var(--accent)]">♥</span> en Venezuela</p>
        </div>
      </div>
    </footer>
  );
}
