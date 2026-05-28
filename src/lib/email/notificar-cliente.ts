// =====================================================================
// Emails al cliente: confirmación y rechazo de reserva
// =====================================================================
// En modo prueba de Resend (sin dominio verificado) solo se puede enviar
// a mcgolemshop@gmail.com. Para no romper el flujo, en ese caso
// redirigimos el email a esa dirección con un prefijo en el asunto que
// indica el destinatario real. Así Orlando puede ver qué le llegaría
// al cliente y notificarle manualmente vía WhatsApp.
//
// Cuando se verifique un dominio (Fase 4), basta con setear
// RESEND_DOMINIO_VERIFICADO=true en .env y los emails irán al cliente real.
// =====================================================================

import { Resend } from 'resend';
import { formatoFechaCorta, formatoUSD } from '@/lib/formato';

const EMAIL_DUENO = 'mcgolemshop@gmail.com';
const REMITENTE_PRUEBA = 'Posadas San Andrés <onboarding@resend.dev>';

const dominioVerificado = process.env.RESEND_DOMINIO_VERIFICADO === 'true';

export interface DatosConfirmacion {
  cliente_email: string;
  cliente_nombre: string;
  posada_nombre: string;
  modalidad: 'apartamento' | 'completa';
  apartamento_nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  num_personas: number;
  total_usd: number;
  reserva_id: string;
}

export async function enviarConfirmacionCliente(datos: DatosConfirmacion): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email-cliente] RESEND_API_KEY no configurada — omitido');
    return;
  }

  const destinoReal = datos.cliente_email;
  const destino = dominioVerificado ? destinoReal : EMAIL_DUENO;
  const prefijo = dominioVerificado ? '' : `[PRUEBA → ${destinoReal}] `;

  const modalidadLabel =
    datos.modalidad === 'completa'
      ? 'Posada completa'
      : `Apartamento ${datos.apartamento_nombre ?? ''}`;

  const subject = `${prefijo}¡Tu reserva está confirmada! · ${datos.posada_nombre}`;

  const html = plantillaBase({
    titulo: '¡Tu reserva está confirmada! 🎉',
    saludo: `Hola ${datos.cliente_nombre},`,
    cuerpo: `<p>Confirmamos tu reserva en <strong>${escapar(datos.posada_nombre)}</strong>. Te esperamos:</p>`,
    detalles: [
      { k: 'Modalidad', v: modalidadLabel },
      { k: 'Llegada', v: `${formatoFechaCorta(datos.fecha_inicio)} (check-in 2:00 PM)` },
      { k: 'Salida', v: `${formatoFechaCorta(datos.fecha_fin)} (check-out 12:00 m)` },
      { k: 'Personas', v: String(datos.num_personas) },
      { k: 'Total pagado', v: formatoUSD(datos.total_usd) },
      { k: 'Número de reserva', v: datos.reserva_id.slice(0, 8).toUpperCase() },
    ],
    pie: 'Cualquier duda, escríbenos. ¡Nos vemos pronto en Chichiriviche! 🌊',
  });

  await enviar({ apiKey, destino, subject, html });
}

export interface DatosRechazo {
  cliente_email: string;
  cliente_nombre: string;
  posada_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  reserva_id: string;
}

export async function enviarRechazoCliente(datos: DatosRechazo): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email-cliente] RESEND_API_KEY no configurada — omitido');
    return;
  }

  const destinoReal = datos.cliente_email;
  const destino = dominioVerificado ? destinoReal : EMAIL_DUENO;
  const prefijo = dominioVerificado ? '' : `[PRUEBA → ${destinoReal}] `;

  const subject = `${prefijo}Sobre tu solicitud de reserva · ${datos.posada_nombre}`;

  const html = plantillaBase({
    titulo: 'No pudimos confirmar tu solicitud',
    saludo: `Hola ${datos.cliente_nombre},`,
    cuerpo: `
      <p>Lamentablemente no pudimos confirmar tu reserva para <strong>${escapar(datos.posada_nombre)}</strong>
      del ${formatoFechaCorta(datos.fecha_inicio)} al ${formatoFechaCorta(datos.fecha_fin)}.</p>
      <p style="background: #fef2f2; border-left: 3px solid #dc2626; padding: 12px; margin: 16px 0;">
        <strong>Motivo:</strong> ${escapar(datos.motivo)}
      </p>
      <p>Si pagaste algo, te devolveremos el monto íntegro. Si tienes preguntas o quieres
      buscar fechas alternativas, contáctanos.</p>
    `,
    detalles: [
      { k: 'Número de reserva', v: datos.reserva_id.slice(0, 8).toUpperCase() },
    ],
    pie: '',
  });

  await enviar({ apiKey, destino, subject, html });
}

// ---------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------

async function enviar({ apiKey, destino, subject, html }: { apiKey: string; destino: string; subject: string; html: string }) {
  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from: REMITENTE_PRUEBA,
      to: destino,
      subject,
      html,
    });
    if (error) console.error('[email-cliente] Resend error:', error);
    else console.log(`[email-cliente] enviado a ${destino} — ${subject}`);
  } catch (err) {
    console.error('[email-cliente] excepción:', err);
  }
}

function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function plantillaBase(opts: {
  titulo: string;
  saludo: string;
  cuerpo: string;
  detalles: Array<{ k: string; v: string }>;
  pie: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1d2538;">
  <h1 style="color: #1e3a5f;">${escapar(opts.titulo)}</h1>
  <p>${escapar(opts.saludo)}</p>
  ${opts.cuerpo}
  ${opts.detalles.length > 0 ? `
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <table style="width: 100%; border-collapse: collapse;">
      ${opts.detalles.map(d => `
        <tr><td style="padding: 4px 0; color: #6b7280;">${escapar(d.k)}</td><td style="padding: 4px 0; text-align: right;"><strong>${escapar(d.v)}</strong></td></tr>
      `).join('')}
    </table>
  </div>` : ''}
  ${opts.pie ? `<p style="color: #6b7280; margin-top: 24px;">${escapar(opts.pie)}</p>` : ''}
  <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
    Posadas San Andrés · Chichiriviche, estado Falcón, Venezuela
  </p>
</body>
</html>
  `.trim();
}
