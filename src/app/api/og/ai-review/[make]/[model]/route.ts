import { NextRequest, NextResponse } from 'next/server';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviews } from '@/lib/expertReviews';

export const dynamic = 'force-dynamic';

const R = '#e63946';
const BG = '#0a0b0f';
const CARD = '#13151c';
const BORDER = '#1e2130';
const TEXT = '#f0f2f5';
const MUTED = '#6b7280';
const GREEN = '#22c55e';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ make: string; model: string }> }) {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  const model = make ? await getModelBySlug(makeSlug, modelSlug) : null;
  if (!make || !model) return new NextResponse('Not found', { status: 404 });

  const reviews = await getExpertReviews(makeSlug, modelSlug);
  const review = reviews[0] ?? null;

  const summary = review?.localSummaryHe ?? review?.globalSummaryHe ?? null;
  const excerpt = summary ? summary.slice(0, 220) + (summary.length > 220 ? '...' : '') : null;
  const score = review?.topScore ?? null;
  const scoreColor = score == null ? MUTED : score >= 7.5 ? GREEN : score >= 5.5 ? '#f59e0b' : R;
  const pros = review?.pros?.slice(0, 3) ?? [];
  const cons = review?.cons?.slice(0, 3) ?? [];
  const postCount = (review?.localPostCount ?? 0) + (review?.globalPostCount ?? 0);

  const prosHtml = pros.length ? `
    <div style="flex:1;background:${CARD};border:1px solid ${GREEN}33;border-radius:12px;padding:14px 18px;">
      <div style="font-size:13px;font-weight:700;color:${GREEN};margin-bottom:10px;">✅ יתרונות</div>
      ${pros.map(p => `<div style="font-size:13px;color:${TEXT};margin-bottom:6px;display:flex;gap:8px;"><span style="color:${GREEN};flex-shrink:0;">•</span>${p}</div>`).join('')}
    </div>` : '';

  const consHtml = cons.length ? `
    <div style="flex:1;background:${CARD};border:1px solid ${R}33;border-radius:12px;padding:14px 18px;">
      <div style="font-size:13px;font-weight:700;color:${R};margin-bottom:10px;">⚠️ חסרונות</div>
      ${cons.map(c => `<div style="font-size:13px;color:${TEXT};margin-bottom:6px;display:flex;gap:8px;"><span style="color:${R};flex-shrink:0;">•</span>${c}</div>`).join('')}
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=1200"/>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Rubik',sans-serif;background:${BG};width:1200px;height:630px;overflow:hidden;}</style>
</head>
<body>
  <div style="width:1200px;height:630px;display:flex;flex-direction:column;padding:36px 48px;position:relative;">
    <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:linear-gradient(to bottom,${R},#7c1520);"></div>

    <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;">
      <img src="${make.logoUrl}" alt="${make.nameEn}" style="width:64px;height:64px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'"/>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:${R};letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">סיכום AI · carissues.co.il</div>
        <h1 style="font-size:36px;font-weight:900;color:${TEXT};line-height:1.1;">${make.nameHe} ${model.nameHe}</h1>
      </div>
      ${score !== null ? `
      <div style="width:100px;height:100px;border-radius:50%;border:4px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;background:${CARD};flex-shrink:0;">
        <div style="font-size:30px;font-weight:900;color:${scoreColor};line-height:1;">${score.toFixed(1)}</div>
        <div style="font-size:11px;color:${MUTED};margin-top:2px;">מתוך 10</div>
      </div>` : ''}
    </div>

    ${excerpt ? `
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:18px 22px;margin-bottom:20px;position:relative;">
      <div style="position:absolute;top:-10px;right:18px;background:${R};color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;">🤖 סיכום AI</div>
      <p style="font-size:15px;color:${TEXT};line-height:1.7;direction:rtl;">${excerpt}</p>
      ${postCount > 0 ? `<div style="margin-top:10px;font-size:12px;color:${MUTED};">מבוסס על ${postCount} פוסטים ודיונים אמיתיים</div>` : ''}
    </div>` : ''}

    ${(pros.length > 0 || cons.length > 0) ? `
    <div style="display:flex;gap:16px;margin-bottom:20px;">
      ${prosHtml}
      ${consHtml}
    </div>` : ''}

    <div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${R};"></div>
        <span style="font-size:12px;color:${MUTED};">סיכום AI מבוסס על ביקורות אמיתיות של בעלי רכב בישראל ובעולם</span>
      </div>
      <div style="font-size:13px;font-weight:700;color:${R};">carissues.co.il ←</div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
