import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbAll, dbFirst, dbRun } from '@/lib/db';
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

  const data = await dbAll(
    'SELECT id, name, email, subject, message, status, reply_body, replied_at, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 200',
  );
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, id } = body;

  if (action === 'mark_read') {
    await dbRun("UPDATE contact_messages SET status = 'read', read = 1 WHERE id = ?", id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'reply') {
    const { replyBody } = body;
    if (!replyBody?.trim()) return NextResponse.json({ error: 'reply body required' }, { status: 400 });

    const msg = await dbFirst<{ name: string; email: string; subject: string; message: string }>(
      'SELECT name, email, subject, message FROM contact_messages WHERE id = ?', id,
    );
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

    await dbRun(
      "UPDATE contact_messages SET status = 'replied', read = 1, reply_body = ?, replied_at = ? WHERE id = ?",
      replyBody.trim(), new Date().toISOString(), id,
    );
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    await dbRun('DELETE FROM contact_messages WHERE id = ?', id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
