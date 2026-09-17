import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_CANDIDATES = [
  path.join(__dirname, '..', '..', 'client', 'public', 'h2r-crest.png'),
  path.join(__dirname, '..', 'public', 'h2r-crest.png'),
];
const LOGO_PATH = LOGO_CANDIDATES.find((p) => fs.existsSync(p)) || '';
export const LOGO_CID = 'h2r-logo';

export const STORE_EMAIL = process.env.STORE_EMAIL || 'h2rsports7@gmail.com';
export const STORE_PHONE = process.env.STORE_PHONE || '+91 99949 78963';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
export const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

const PLACEHOLDER_EMAIL = /@phone\.h2rsports\.in$/i;

let transporter = null;

/** Phone-checkout accounts get a synthetic @phone.h2rsports.in email — never mail those. */
export function isDeliverableEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  if (PLACEHOLDER_EMAIL.test(value)) return false;
  return true;
}

export function isMailConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS);
}

export function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function brandLogoHtml() {
  if (!LOGO_PATH) {
    return `<p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#c8102e;">H2R Sports</p>`;
  }
  return `<img src="cid:${LOGO_CID}" alt="H2R Sports" width="64" height="64" style="display:block;width:64px;height:64px;border:0;margin:0 0 12px;" />`;
}

/** Shared branded wrapper for one-off account emails (verification, password reset, etc). */
export function wrapSimpleEmail({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0a2540;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;padding:28px;">
    ${brandLogoHtml()}
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#c8102e;">H2R Sports</p>
    <h1 style="margin:0 0 16px;font-size:22px;">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">
      Questions? WhatsApp / call ${escapeHtml(STORE_PHONE)} or reply to this email (${escapeHtml(STORE_EMAIL)}).
    </p>
  </div>
</body></html>`;
}

export function logoAttachment() {
  if (!LOGO_PATH) return [];
  return [
    {
      filename: 'h2r-crest.png',
      path: LOGO_PATH,
      cid: LOGO_CID,
      contentType: 'image/png',
    },
  ];
}

export async function sendMail({ to, bcc, subject, html, text }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('Email skipped: set SMTP_USER and SMTP_PASS on the sending mailbox (not the client Gmail).');
    return { sent: false, reason: 'not-configured' };
  }
  try {
    await mailer.sendMail({
      from: `H2R Sports <${SMTP_FROM}>`,
      to,
      bcc,
      replyTo: STORE_EMAIL,
      subject,
      text,
      html,
      attachments: logoAttachment(),
    });
    return { sent: true, to, bcc: bcc || null };
  } catch (err) {
    console.warn('Email failed:', err.message);
    return { sent: false, reason: err.message };
  }
}
