import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const transport = config.smtpEnabled
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    })
  : null;

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Envía un correo por SMTP. Si no hay SMTP configurado, en desarrollo el contenido
 * se muestra en la consola del servidor (nunca se finge un envío).
 */
export async function sendMail(mail: Mail) {
  if (transport) {
    await transport.sendMail({ from: config.MAIL_FROM, ...mail });
    return;
  }
  if (!config.isProd) {
    console.log(
      [
        '',
        '┌──────────────── CORREO (SMTP no configurado, solo consola) ────────────────',
        `│ Para:   ${mail.to}`,
        `│ Asunto: ${mail.subject}`,
        '│',
        ...mail.text.split('\n').map((l) => `│ ${l}`),
        '└────────────────────────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
    return;
  }
  console.warn(`[mail] SMTP no configurado: no se pudo enviar "${mail.subject}" a ${mail.to}`);
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function passwordResetMail(name: string, link: string, minutes: number): Omit<Mail, 'to'> {
  return {
    subject: 'Restablece tu contraseña — NEON LIQUOR',
    text: `Hola ${name},\n\nPara crear una nueva contraseña abre este enlace (válido ${minutes} minutos y de un solo uso):\n${link}\n\nSi no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.`,
    html: `<p>Hola ${escape(name)},</p><p>Para crear una nueva contraseña abre este enlace (válido ${minutes} minutos y de un solo uso):</p><p><a href="${escape(link)}">${escape(link)}</a></p><p>Si no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.</p>`,
  };
}
