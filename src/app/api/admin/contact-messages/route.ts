import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';
import { Resend } from 'resend';

const SUBJECT_LABELS: Record<string, string> = {
  general: 'שאלה כללית',
  content_removal: 'בקשת הסרת תוכן',
  bug: 'דיווח על תקלה טכנית',
  review_issue: 'בעיה בביקורת',
  other: 'אחר',
};

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  const { data, error } = await sb
    .from('contact_messages')
    .select('id, name, email, subject, message, status, reply_body, replied_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, id } = body;
  const sb = getServiceClient();

  if (action === 'mark_read') {
    const { error } = await sb
      .from('contact_messages')
      .update({ status: 'read', read: true })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reply') {
    const { replyBody } = body;
    if (!replyBody?.trim()) return NextResponse.json({ error: 'reply body required' }, { status: 400 });

    // Fetch the message to get sender details
    const { data: msg } = await sb
      .from('contact_messages')
      .select('name, email, subject, message')
      .eq('id', id)
      .single();

    if (!msg) return NextResponse.json({ error: 'message not found' }, { status: 404 });

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const subjectLabel = SUBJECT_LABELS[msg.subject] ?? msg.subject ?? 'כללי';

    const { error: sendError, data: sendData } = await resend.emails.send({
      from: 'CarIssues IL <contact@carissues.co.il>',
      to: [msg.email],
      replyTo: 'contact@carissues.co.il',
      subject: `Re: ${subjectLabel} — CarIssues IL`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <p>שלום ${msg.name},</p>
          <div style="white-space: pre-wrap; line-height: 1.7;">${replyBody.trim()}</div>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
          <div style="color: #888; font-size: 12px;">
            <p>בברכה,<br/>צוות CarIssues IL<br/><a href="https://carissues.co.il">carissues.co.il</a></p>
            <details style="margin-top: 16px;">
              <summary style="cursor: pointer;">הפנייה המקורית</summary>
              <blockquote style="border-right: 3px solid #ddd; padding-right: 12px; margin: 8px 0; color: #666; white-space: pre-wrap;">${msg.message}</blockquote>
            </details>
          </div>
        </div>
      `,
    });

    if (sendError) {
      console.error('[contact reply] resend error', JSON.stringify(sendError));
      return NextResponse.json({ error: 'Failed to send email', detail: sendError }, { status: 500 });
    }
    console.log('[contact reply] sent', sendData?.id);

    // Mark as replied in DB
    await sb.from('contact_messages').update({
      status: 'replied',
      read: true,
      reply_body: replyBody.trim(),
      replied_at: new Date().toISOString(),
    }).eq('id', id);

    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const { error } = await sb.from('contact_messages').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
