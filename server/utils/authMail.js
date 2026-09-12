import { escapeHtml, isMailConfigured, sendMail, wrapSimpleEmail } from './mailer.js';

/** Best-effort — never throws to the auth flow. */
export async function sendPasswordResetEmail(user, resetUrl) {
  if (!isMailConfigured()) {
    console.warn(`[dev] SMTP not configured — password reset link for ${user.email}: ${resetUrl}`);
  }
  const name = escapeHtml(user?.name || 'there');
  const html = wrapSimpleEmail({
    title: 'Reset your password',
    bodyHtml: `
      <p style="margin:0 0 20px;line-height:1.5;">Hi ${name}, we received a request to reset your H2R Sports account password.</p>
      <p style="margin:0 0 24px;">
        <a href="${resetUrl}" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;">Reset password</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Or copy this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:13px;word-break:break-all;color:#0a2540;">${escapeHtml(resetUrl)}</p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    `,
  });
  const text = `Reset your H2R Sports password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`;
  return sendMail({ to: user.email, subject: 'Reset your H2R Sports password', html, text });
}

export async function sendVerificationEmail(user, verifyUrl) {
  if (!isMailConfigured()) {
    console.warn(`[dev] SMTP not configured — verification link for ${user.email}: ${verifyUrl}`);
  }
  const name = escapeHtml(user?.name || 'there');
  const html = wrapSimpleEmail({
    title: 'Verify your email',
    bodyHtml: `
      <p style="margin:0 0 20px;line-height:1.5;">Hi ${name}, please confirm this is your email address to finish setting up your H2R Sports account.</p>
      <p style="margin:0 0 24px;">
        <a href="${verifyUrl}" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;">Verify email</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Or copy this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:13px;word-break:break-all;color:#0a2540;">${escapeHtml(verifyUrl)}</p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">This link expires in 24 hours.</p>
    `,
  });
  const text = `Verify your H2R Sports email: ${verifyUrl}\n\nThis link expires in 24 hours.`;
  return sendMail({ to: user.email, subject: 'Verify your H2R Sports email', html, text });
}
