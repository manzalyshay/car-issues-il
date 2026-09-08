import { Resend } from 'resend';

/** Send an email via Resend. Fire-and-forget safe (never throws). */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: 'CarIssues <contact@carissues.co.il>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
  } catch { /* non-fatal */ }
}
