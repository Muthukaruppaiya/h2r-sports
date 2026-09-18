import '../loadEnv.js';
import { isMailConfigured, sendMail, wrapSimpleEmail } from '../utils/mailer.js';

const to = process.argv[2] || 'sivamkaruppaiya15@gmail.com';

if (!isMailConfigured()) {
  console.log(JSON.stringify({ sent: false, reason: 'SMTP_USER / SMTP_PASS missing' }));
  process.exit(1);
}

const result = await sendMail({
  to,
  subject: 'H2R Sports — test email',
  text: 'This is a test from H2R Sports. If you received this, order emails are working.',
  html: wrapSimpleEmail({
    title: 'Test email',
    bodyHtml:
      '<p style="margin:0;line-height:1.55;">This is a test from H2R Sports. If you received this, SMTP is working and order / delivery emails will send from the same mailbox.</p>',
  }),
});

console.log(JSON.stringify(result));
if (!result.sent) process.exit(1);
