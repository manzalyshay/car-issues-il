import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SUBJECT_LABELS: Record<string, string> = {
  general: 'שאלה כללית',
  content_removal: 'בקשת הסרת תוכן',
  bug: 'דיווח על תקלה טכנית',
  review_issue: 'בעיה בביקורת',
  other: 'אחר',
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.message) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const { error } = await sb.from('contact_messages').insert({
    name: String(body.name).slice(0, 120),
    email: String(body.email).slice(0, 200),
    subject: String(body.subject || 'general').slice(0, 60),
    message: String(body.message).slice(0, 4000),
    status: 'unread',
  });

  if (error) {
    console.error('contact insert error', error);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  // Send notification email
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const subjectLabel = SUBJECT_LABELS[body.subject] ?? body.subject ?? 'כללי';
    const { error: emailErr } = await resend.emails.send({
      from: 'CarIssues IL <contact@carissues.co.il>',
      to: ['contact@carissues.co.il'],
      replyTo: body.email,
      subject: `[פנייה חדשה] ${subjectLabel} — ${body.name}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e63946;">פנייה חדשה מ-CarIssues IL</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px; font-weight: bold; width: 120px;">שם:</td><td style="padding: 8px;">${body.name}</td></tr>
            <tr style="background:#f5f5f5;"><td style="padding: 8px; font-weight: bold;">אימייל:</td><td style="padding: 8px;"><a href="mailto:${body.email}">${body.email}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">נושא:</td><td style="padding: 8px;">${subjectLabel}</td></tr>
          </table>
          <div style="background: #f9f9f9; border-right: 4px solid #e63946; padding: 16px; border-radius: 4px; white-space: pre-wrap;">${body.message}</div>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">ניתן להשיב ישירות למייל זה או דרך לוח הניהול: <a href="https://carissues.co.il/admin?tab=contact">carissues.co.il/admin</a></p>
        </div>
      `,
    });
    if (emailErr) {
      console.error('[contact] resend error:', JSON.stringify(emailErr));
    }
  } else {
    console.warn('[contact] RESEND_API_KEY not set — email not sent');
  }

  return NextResponse.json({ ok: true });
}
