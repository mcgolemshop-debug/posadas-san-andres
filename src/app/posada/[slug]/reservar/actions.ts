'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcularPrecioReserva } from '@/lib/pricing/calcular';
import { validarDisponibilidad } from '@/lib/pricing/disponibilidad';
import { notificarDuenoNuevaReserva } from '@/lib/email/notificar-dueno';
import type { ModalidadReserva, PrecioInfo, TemporadaInfo } from '@/lib/pricing/tipos';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const TAMANO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const schema = z.object({
  posada_slug: z.enum(['confort', 'beach']),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de llegada inválida.'),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de salida inválida.'),
  modalidad: z.enum(['apartamento', 'completa']),
  apartamento_id: z.string().uuid().nullable(),
  /** Multi-apto: array de IDs cuando modalidad=apartamento. Si vacío, cae a apartamento_id. */
  apartamentos_ids: z.array(z.string().uuid()).default([]),
  num_personas: z.coerce.number().int().positive().max(50),
  num_personas_extras: z.coerce.number().int().min(0).max(50).default(0),
  cliente_nombre: z.string().min(1, 'Nombre requerido.').max(200),
  cliente_telefono: z.string().min(1, 'Teléfono requerido.').max(50),
  cliente_email: z.string().email('Email inválido.').max(200),
  notas: z.string().max(2000).nullable(),
});

export interface EstadoEnvio {
  error?: string;
  campos_invalidos?: string[];
}

export async function enviarReserva(
  _prev: EstadoEnvio | null,
  formData: FormData,
): Promise<EstadoEnvio> {
  // --- 1) Parsear y validar campos ---
  const apto = formData.get('apartamento_id');
  // Multi-apto: getAll trae todos los inputs con name="apartamentos_ids"
  const aptosIds = formData.getAll('apartamentos_ids').filter((v): v is string => typeof v === 'string' && v.length > 0);
  const datos = {
    posada_slug: formData.get('posada_slug'),
    fecha_inicio: formData.get('fecha_inicio'),
    fecha_fin: formData.get('fecha_fin'),
    modalidad: formData.get('modalidad'),
    apartamento_id: apto && apto !== '' ? apto : null,
    apartamentos_ids: aptosIds,
    num_personas: formData.get('num_personas'),
    num_personas_extras: formData.get('num_personas_extras') || 0,
    cliente_nombre: formData.get('cliente_nombre'),
    cliente_telefono: formData.get('cliente_telefono'),
    cliente_email: formData.get('cliente_email'),
    notas: formData.get('notas') || null,
  };

  const v = schema.safeParse(datos);
  if (!v.success) {
    return {
      error: 'Por favor revisa los campos: ' + v.error.issues.map((i) => i.message).join(' '),
      campos_invalidos: v.error.issues.map((i) => i.path.join('.')),
    };
  }
  const datosOK = v.data;

  // --- 2) Validar comprobante de pago (OBLIGATORIO) ---
  const comprobante = formData.get('comprobante') as File | null;
  if (!comprobante || comprobante.size === 0) {
    return { error: 'El comprobante de pago es obligatorio.' };
  }
  if (comprobante.size > TAMANO_MAX_BYTES) {
    return { error: 'El comprobante supera los 10 MB. Reduce el archivo y vuelve a intentar.' };
  }
  if (!TIPOS_PERMITIDOS.includes(comprobante.type)) {
    return { error: 'Formato de comprobante no permitido. Usa JPG, PNG, WebP, HEIC o PDF.' };
  }

  // --- 3) Validar coherencia interna ---
  if (datosOK.modalidad === 'apartamento' && !datosOK.apartamento_id) {
    return { error: 'Si reservas un apartamento individual, selecciona cuál.' };
  }
  if (datosOK.modalidad === 'completa' && datosOK.apartamento_id) {
    // Limpiamos: si se eligió completa, ignoramos apartamento
    datosOK.apartamento_id = null;
  }

  const supabase = await createClient();

  // --- 4) Obtener IDs reales y datos para el cálculo ---
  const { data: posada, error: errPosada } = await supabase
    .from('posadas')
    .select('id, slug, tipo_alquiler, activa')
    .eq('slug', datosOK.posada_slug)
    .maybeSingle();
  if (errPosada || !posada || !posada.activa) {
    return { error: 'La posada no existe o no está activa.' };
  }

  // Consistencia: Beach no permite apartamento
  if (posada.tipo_alquiler === 'solo_completa' && datosOK.modalidad === 'apartamento') {
    return { error: 'Esta posada solo se alquila completa.' };
  }

  const [tempsRes, preciosRes] = await Promise.all([
    supabase
      .from('temporadas')
      .select(
        'id, nombre, prioridad, estadia_minima_noches, fuerza_completa_confort, costo_extra_persona_usd, fecha_inicio, fecha_fin, activa',
      ),
    supabase
      .from('precios')
      .select('posada_id, temporada_id, modalidad, num_personas, precio_usd, activo')
      .eq('activo', true),
  ]);

  if (tempsRes.error || preciosRes.error) {
    return { error: 'No pude cargar la información de precios. Intenta de nuevo en un momento.' };
  }

  // --- 5) Recalcular precio en el servidor (no confiamos en el cliente) ---
  const temporadas: TemporadaInfo[] = (tempsRes.data ?? []).map((t) => ({
    id: t.id as string,
    nombre: t.nombre as string,
    prioridad: t.prioridad as number,
    estadia_minima_noches: t.estadia_minima_noches as number,
    fuerza_completa_confort: t.fuerza_completa_confort as boolean,
    costo_extra_persona_usd: Number(t.costo_extra_persona_usd ?? 0),
    fecha_inicio: t.fecha_inicio as string | null,
    fecha_fin: t.fecha_fin as string | null,
    activa: t.activa as boolean,
  }));

  const precios: PrecioInfo[] = (preciosRes.data ?? []).map((p) => ({
    posada_id: p.posada_id as string,
    temporada_id: p.temporada_id as string,
    modalidad: p.modalidad as ModalidadReserva,
    num_personas: p.num_personas as number | null,
    precio_usd: Number(p.precio_usd),
    activo: p.activo as boolean,
  }));

  // Cantidad de apartamentos seleccionados (multi-apto)
  const cantidadApartamentos = datosOK.modalidad === 'apartamento'
    ? Math.max(1, datosOK.apartamentos_ids.length)
    : 1;

  const resultado = calcularPrecioReserva({
    posada_slug: posada.slug as 'confort' | 'beach',
    posada_id: posada.id as string,
    fecha_inicio: datosOK.fecha_inicio,
    fecha_fin: datosOK.fecha_fin,
    modalidad: datosOK.modalidad,
    num_personas: datosOK.num_personas,
    cantidad_apartamentos: cantidadApartamentos,
    num_personas_extras: datosOK.num_personas_extras,
    temporadas,
    precios,
  });

  if (resultado.tiene_errores || !resultado.cumple_estadia_minima || resultado.total_usd <= 0) {
    return {
      error:
        resultado.advertencias.length > 0
          ? resultado.advertencias.join(' ')
          : 'No pudimos calcular el precio para esas fechas.',
    };
  }

  // --- 6) Validar disponibilidad (multi-apto si aplica) ---
  const disp = await validarDisponibilidad(supabase, {
    posada_id: posada.id as string,
    apartamento_id: datosOK.apartamento_id,
    apartamentos_ids: datosOK.apartamentos_ids.length > 0 ? datosOK.apartamentos_ids : null,
    modalidad: datosOK.modalidad,
    fecha_inicio: datosOK.fecha_inicio,
    fecha_fin: datosOK.fecha_fin,
  });
  if (!disp.disponible) {
    return { error: disp.mensaje ?? 'Esas fechas no están disponibles.' };
  }

  // --- 7) Subir comprobante a Storage (con admin client) ---
  const admin = createAdminClient();

  const ext = (comprobante.name.split('.').pop() || 'bin').toLowerCase();
  const nombreArchivo = `${posada.slug}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await comprobante.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from('comprobantes-pago')
    .upload(nombreArchivo, arrayBuffer, {
      contentType: comprobante.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadErr) {
    return { error: `No pude subir el comprobante: ${uploadErr.message}` };
  }

  // --- 8) Insertar reserva pendiente ---
  // Usamos el admin client porque la política de anon insert exige estado='pendiente'
  // y nosotros queremos garantizar que se inserte ahí (es lo único permitido para anon)
  const { data: reserva, error: insertErr } = await admin
    .from('reservas')
    .insert({
      posada_id: posada.id,
      apartamento_id: datosOK.apartamento_id,
      apartamentos_ids: datosOK.apartamentos_ids.length > 0 ? datosOK.apartamentos_ids : null,
      modalidad: datosOK.modalidad,
      fecha_inicio: datosOK.fecha_inicio,
      fecha_fin: datosOK.fecha_fin,
      cliente_nombre: datosOK.cliente_nombre,
      cliente_telefono: datosOK.cliente_telefono,
      cliente_email: datosOK.cliente_email,
      num_personas: datosOK.num_personas,
      num_personas_extras: datosOK.num_personas_extras,
      estado: 'pendiente',
      total_usd: resultado.total_usd,
      desglose_precio: {
        subtotal_usd: resultado.subtotal_usd,
        extras_personas_usd: resultado.extras_personas_usd,
        servicio_extra_usd: resultado.servicio_extra_usd,
        descuento_usd: resultado.descuento_usd,
        noches: resultado.noches,
        temporadas_aplicadas: resultado.temporadas_aplicadas,
      },
      notas: datosOK.notas,
      comprobante_pago_url: nombreArchivo,
    })
    .select('id')
    .single();

  if (insertErr || !reserva) {
    // Si falló el insert, intentamos borrar el comprobante para no dejar basura
    await admin.storage.from('comprobantes-pago').remove([nombreArchivo]);
    return { error: `No pude guardar la reserva: ${insertErr?.message ?? 'error desconocido'}` };
  }

  // --- 9) Notificar al Dueño por email (sin bloquear si falla) ---
  // Generamos una URL firmada del comprobante con validez 7 días para incluir en el email
  const { data: signed } = await admin.storage
    .from('comprobantes-pago')
    .createSignedUrl(nombreArchivo, 60 * 60 * 24 * 7);

  // Leemos info adicional para el cuerpo del email
  const { data: extras } = await admin
    .from('reservas')
    .select('posadas(nombre), apartamentos(nombre)')
    .eq('id', reserva.id)
    .maybeSingle();
  const posadaNombre = (() => {
    const p = extras?.posadas as { nombre: string } | { nombre: string }[] | null;
    return Array.isArray(p) ? p[0]?.nombre : p?.nombre;
  })() ?? 'Posada';
  const aptoNombre = (() => {
    const a = extras?.apartamentos as { nombre: string } | { nombre: string }[] | null;
    return Array.isArray(a) ? (a[0]?.nombre ?? null) : (a?.nombre ?? null);
  })();

  // Disparar el email en background. Si falla, solo lo logueamos.
  await notificarDuenoNuevaReserva({
    reserva_id: reserva.id as string,
    posada_nombre: posadaNombre,
    apartamento_nombre: aptoNombre,
    modalidad: datosOK.modalidad,
    fecha_inicio: datosOK.fecha_inicio,
    fecha_fin: datosOK.fecha_fin,
    num_personas: datosOK.num_personas,
    total_usd: resultado.total_usd,
    cliente_nombre: datosOK.cliente_nombre,
    cliente_telefono: datosOK.cliente_telefono,
    cliente_email: datosOK.cliente_email,
    notas: datosOK.notas,
    comprobante_url_publica: signed?.signedUrl ?? null,
  });

  // --- 10) Redirigir a la página de confirmación ---
  // (redirect lanza una excepción especial que el framework captura)
  redirect(`/reserva-enviada/${reserva.id}`);
}
