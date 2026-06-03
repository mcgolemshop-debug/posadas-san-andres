// =====================================================================
// Notificación al Dueño cuando llega una nueva solicitud de reserva
// =====================================================================
// Usa Resend. En modo de desarrollo (sin dominio verificado), Resend
// solo permite enviar al email del titular de la cuenta — por eso el
// destinatario está hardcodeado a velasquezorlandodavid@gmail.com.
// Cuando se verifique un dominio propio (Fase 4), podremos enviar
// también al cliente.
//
// IMPORTANTE: si Resend falla, lo logueamos pero NO rompemos el envío
// de la reserva. La reserva ya está guardada en la BD; el email es
// un nice-to-have.
// =====================================================================

import { Resend } from 'resend';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

// En modo prueba de Resend, solo se puede enviar al email del titular de la cuenta
// (mcgolemshop@gmail.com). Otros destinatarios serán rechazados por Resend hasta
// que se verifique un dominio propio.
//
// Por eso mantenemos la lista de destinatarios reales en TODOS_DESTINATARIOS y
// filtramos a los que Resend acepta en este momento. Al verificar dominio
// (Fase 4), basta con poner RESEND_DOMINIO_VERIFICADO=true y reciben todos.
const TODOS_DESTINATARIOS = [
  'mcgolemshop@gmail.com',     // Orlando — owner de la cuenta Resend
  'leninrpetit@gmail.com',     // Lenin — añadido en Onda 1 (2026)
];
const EMAIL_TITULAR_RESEND = 'mcgolemshop@gmail.com';
const REMITENTE = 'Posadas San Andrés <onboarding@resend.dev>';

function destinatariosNotificacion(): string[] {
  const dominioVerificado = process.env.RESEND_DOMINIO_VERIFICADO === 'true';
  return dominioVerificado ? TODOS_DESTINATARIOS : [EMAIL_TITULAR_RESEND];
}

export interface DatosNotificacion {
  reserva_id: string;
  posada_nombre: string;
  apartamento_nombre: string | null;
  modalidad: 'apartamento' | 'completa';
  fecha_inicio: string;
  fecha_fin: string;
  num_personas: number;
  total_usd: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  notas: string | null;
  comprobante_url_publica: string | null;
}

export async function notificarDuenoNuevaReserva(datos: DatosNotificacion): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[notificar-dueno] RESEND_API_KEY no configurada — email omitido');
    return;
  }

  const resend = new Resend(apiKey);

  const subject = `Nueva solicitud · ${datos.posada_nombre} · ${datos.cliente_nombre}`;
  const modalidadLabel =
    datos.modalidad === 'completa'
      ? 'Posada completa'
      : `Apartamento ${datos.apartamento_nombre ?? ''}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1d2538;">
  <h1 style="color: #1e3a5f; margin-bottom: 4px;">Nueva solicitud de reserva</h1>
  <p style="color: #6b7280; margin-top: 0;">Recibida desde el sitio web.</p>

  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <h2 style="margin-top: 0; font-size: 16px; color: #1e3a5f;">Cliente</h2>
    <p style="margin: 4px 0;"><strong>${escapar(datos.cliente_nombre)}</strong></p>
    <p style="margin: 4px 0;">📞 ${escapar(datos.cliente_telefono)}</p>
    <p style="margin: 4px 0;">📧 ${escapar(datos.cliente_email)}</p>
    ${datos.notas ? `<p style="margin: 8px 0 0; color: #6b7280; font-style: italic;">Notas: ${escapar(datos.notas)}</p>` : ''}
  </div>

  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <h2 style="margin-top: 0; font-size: 16px; color: #1e3a5f;">Reserva</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 4px 0; color: #6b7280;">Posada</td><td style="padding: 4px 0; text-align: right;">${escapar(datos.posada_nombre)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6b7280;">Modalidad</td><td style="padding: 4px 0; text-align: right;">${escapar(modalidadLabel)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6b7280;">Llegada</td><td style="padding: 4px 0; text-align: right;">${formatoFechaCorta(datos.fecha_inicio)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6b7280;">Salida</td><td style="padding: 4px 0; text-align: right;">${formatoFechaCorta(datos.fecha_fin)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6b7280;">Personas</td><td style="padding: 4px 0; text-align: right;">${datos.num_personas}</td></tr>
      <tr><td style="padding: 8px 0 4px; color: #6b7280; border-top: 1px solid #e5e7eb;">Total</td><td style="padding: 8px 0 4px; text-align: right; border-top: 1px solid #e5e7eb; font-size: 20px; font-weight: bold; color: #1e3a5f;">${formatoUSD(datos.total_usd)}</td></tr>
    </table>
  </div>

  ${datos.comprobante_url_publica ? `
  <p style="margin: 24px 0;">
    <a href="${datos.comprobante_url_publica}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">📎 Ver comprobante de pago</a>
  </p>
  <p style="font-size: 12px; color: #6b7280;">Este enlace es válido por 7 días.</p>
  ` : '<p style="color: #b91c1c;">⚠ No se generó URL del comprobante.</p>'}

  <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
    ID interno de la reserva: <code>${datos.reserva_id}</code><br>
    Recordatorio: la reserva está en estado <strong>pendiente</strong>. Verifica el comprobante y confírmala desde el panel admin (próximamente en Fase 3).
  </p>
</body>
</html>
  `.trim();

  const destinos = destinatariosNotificacion();
  try {
    const { error } = await resend.emails.send({
      from: REMITENTE,
      to: destinos,
      subject,
      html,
      replyTo: datos.cliente_email,
    });

    if (error) {
      console.error('[notificar-dueno] Resend devolvió error:', error);
      return;
    }

    console.log(`[notificar-dueno] Email enviado a ${destinos.join(', ')} para reserva ${datos.reserva_id}`);
  } catch (err) {
    console.error('[notificar-dueno] excepción al enviar:', err);
  }
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
