'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AdminNav } from './admin-nav';
import type { RolUsuario } from '@/lib/auth/session';

/**
 * Botón hamburguesa para mobile que abre/cierra un drawer con la nav.
 * En desktop el sidebar es siempre visible (renderizado por el layout).
 */
export function AdminSidebarMobile({ rol }: { rol: RolUsuario }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        className="lg:hidden p-2 rounded-lg hover:bg-[var(--surface-elevated)] text-[var(--foreground)]"
      >
        <Menu className="w-5 h-5" />
      </button>

      {abierto && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-[var(--surface)] shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <span className="font-display text-lg">Menú</span>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
                className="p-1.5 rounded-lg hover:bg-[var(--surface-elevated)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div onClick={() => setAbierto(false)}>
              <AdminNav rol={rol} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
