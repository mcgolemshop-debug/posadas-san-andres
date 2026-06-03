'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import { Upload, Star, X, Image as ImageIcon } from 'lucide-react';
import {
  subirFotoPosada,
  eliminarFotoPosada,
  type EstadoFoto,
} from '@/app/admin/(panel)/posadas/fotos-actions';
import { urlFotoPosada } from '@/lib/storage/fotos';

interface Props {
  tipo: 'posada' | 'apartamento';
  targetId: string;
  fotoPortada: string | null;
  galeriaUrls: string[];
  titulo: string;
}

export function UploaderFotos({ tipo, targetId, fotoPortada, galeriaUrls, titulo }: Props) {
  const [estado, accionSubir, subiendo] = useActionState<EstadoFoto | null, FormData>(subirFotoPosada, null);
  const [estadoDel, accionDel, eliminando] = useActionState<EstadoFoto | null, FormData>(eliminarFotoPosada, null);
  const [previa, setPrevia] = useState<string | null>(null);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
      <p className="font-semibold mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-[var(--primary)]" /> Fotos · {titulo}
      </p>

      {/* Galería actual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Foto de portada (destacada) */}
        {fotoPortada && (
          <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-[var(--accent)]">
            <Image
              src={urlFotoPosada(fotoPortada)!}
              alt="Portada"
              fill
              sizes="200px"
              className="object-cover"
            />
            <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[var(--accent)] text-white text-[10px] font-semibold rounded flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5" fill="currentColor" /> Portada
            </span>
            <form action={accionDel} className="absolute top-1 right-1">
              <input type="hidden" name="tipo" value={tipo} />
              <input type="hidden" name="target_id" value={targetId} />
              <input type="hidden" name="path" value={fotoPortada} />
              <input type="hidden" name="es_portada" value="true" />
              <button
                type="submit"
                disabled={eliminando}
                title="Eliminar foto"
                className="w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          </div>
        )}

        {galeriaUrls.map((url) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border)]">
            <Image
              src={urlFotoPosada(url)!}
              alt="Foto galería"
              fill
              sizes="200px"
              className="object-cover"
            />
            <form action={accionDel} className="absolute top-1 right-1">
              <input type="hidden" name="tipo" value={tipo} />
              <input type="hidden" name="target_id" value={targetId} />
              <input type="hidden" name="path" value={url} />
              <input type="hidden" name="es_portada" value="false" />
              <button
                type="submit"
                disabled={eliminando}
                title="Eliminar foto"
                className="w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          </div>
        ))}

        {galeriaUrls.length === 0 && !fotoPortada && (
          <div className="col-span-2 sm:col-span-4 aspect-[4/1] rounded-lg border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--foreground-subtle)] text-sm">
            Sin fotos todavía. Sube la primera ↓
          </div>
        )}
      </div>

      {/* Form para subir */}
      <form action={accionSubir} className="space-y-2">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="target_id" value={targetId} />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs flex items-center gap-1.5">
            <input type="radio" name="es_portada" value="true" defaultChecked={!fotoPortada} className="accent-[var(--accent)]" />
            <Star className="w-3 h-3" /> Marcar como portada
          </label>
          <label className="text-xs flex items-center gap-1.5">
            <input type="radio" name="es_portada" value="false" defaultChecked={!!fotoPortada} className="accent-[var(--primary)]" />
            Agregar a galería
          </label>
        </div>
        <input
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPrevia(URL.createObjectURL(f));
          }}
          className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-[var(--primary)] file:text-white file:cursor-pointer hover:file:bg-[var(--primary-hover)] file:text-xs"
        />
        {previa && (
          <div className="w-24 h-24 rounded-md overflow-hidden border border-[var(--border)]">
            <Image src={previa} alt="Vista previa" width={96} height={96} className="object-cover" />
          </div>
        )}
        <button
          type="submit"
          disabled={subiendo}
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> {subiendo ? 'Subiendo…' : 'Subir foto'}
        </button>
        {estado?.error && <p className="text-xs text-red-700">⚠ {estado.error}</p>}
        {estado?.ok && <p className="text-xs text-emerald-700">✓ {estado.ok}</p>}
        {estadoDel?.error && <p className="text-xs text-red-700">⚠ {estadoDel.error}</p>}
      </form>

      <p className="text-xs text-[var(--foreground-subtle)] mt-3">
        JPG, PNG o WebP, máximo 5 MB. La portada aparece destacada; las demás van en la galería.
      </p>
    </div>
  );
}
