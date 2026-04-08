import { NextRequest, NextResponse } from 'next/server';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviews } from '@/lib/expertReviews';

export const dynamic = 'force-dynamic';

const R     = '#e63946';
const BG    = '#0a0b0f';
const CARD  = '#13151c';
const TEXT  = '#f0f2f5';
const MUTED = '#9ca3af';
const GREEN = '#22c55e';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ make: string; model: string }> }) {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  const model = make ? await getModelBySlug(makeSlug, modelSlug) : null;
  if (!make || !model) return new NextResponse('Not found', { status: 404 });

  const reviews = await getExpertReviews(makeSlug, modelSlug);
  const review = reviews[0] ?? null;

  const score = review?.topScore ?? null;
  const scoreColor = score == null ? MUTED : score >= 7.5 ? GREEN : score >= 5.5 ? '#f59e0b' : R;
  const pros = review?.pros?.slice(0, 2) ?? [];
  const cons = review?.cons?.slice(0, 2) ?? [];

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=1200"/>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;700;900&display=swap" rel="stylesheet"/>
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Rubik',sans-serif;background:${BG};width:1200px;height:630px;overflow:hidden;}</style>
</head>
<body>
<div style="width:1200px;height:630px;display:flex;position:relative;overflow:hidden;">

  <!-- Red left accent -->
  <div style="position:absolute;top:0;right:0;width:8px;height:100%;background:linear-gradient(to bottom,${R},#7c1520);z-index:10;"></div>

  <!-- Background glow -->
  <div style="position:absolute;top:-150px;right:-150px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(230,57,70,0.15) 0%,transparent 70%);pointer-events:none;"></div>

  <!-- LEFT: Score + name -->
  <div style="width:420px;height:630px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 36px;gap:24px;border-left:1px solid #1e2130;flex-shrink:0;">

    <!-- Logo -->
    <img src="${make.logoUrl}" alt="" style="width:80px;height:80px;object-fit:contain;" onerror="this.style.display='none'"/>

    <!-- Car name -->
    <div style="text-align:center;">
      <div style="font-size:22px;font-weight:700;color:${MUTED};margin-bottom:6px;">${make.nameHe}</div>
      <div style="font-size:56px;font-weight:900;color:${TEXT};line-height:1;letter-spacing:-1px;">${model.nameHe}</div>
    </div>

    <!-- Score -->
    ${score !== null ? `
    <div style="width:150px;height:150px;border-radius:50%;border:5px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;background:${CARD};">
      <div style="font-size:58px;font-weight:900;color:${scoreColor};line-height:1;">${score.toFixed(1)}</div>
      <div style="font-size:16px;color:${MUTED};margin-top:2px;">מתוך 10</div>
    </div>` : ''}

    <div style="font-size:14px;font-weight:700;color:${R};letter-spacing:1px;text-transform:uppercase;">carissues.co.il</div>
  </div>

  <!-- RIGHT: Pros & Cons -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:44px 52px 44px 40px;gap:16px;">

    <div style="font-size:18px;font-weight:700;color:${MUTED};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">ביקורת AI — נהגים ישראלים</div>

    ${pros.map(p => `
    <div style="display:flex;align-items:flex-start;gap:16px;background:${CARD};border:1px solid ${GREEN}30;border-radius:14px;padding:18px 22px;">
      <span style="font-size:24px;color:${GREEN};flex-shrink:0;line-height:1.2;">✓</span>
      <span style="font-size:22px;font-weight:700;color:${TEXT};line-height:1.4;">${p}</span>
    </div>`).join('')}

    ${cons.map(c => `
    <div style="display:flex;align-items:flex-start;gap:16px;background:${CARD};border:1px solid ${R}30;border-radius:14px;padding:18px 22px;">
      <span style="font-size:24px;color:${R};flex-shrink:0;line-height:1.2;">✗</span>
      <span style="font-size:22px;font-weight:700;color:${TEXT};line-height:1.4;">${c}</span>
    </div>`).join('')}

    ${pros.length === 0 && cons.length === 0 ? `
    <div style="font-size:26px;font-weight:700;color:${MUTED};text-align:center;margin-top:20px;">בדוק את הביקורות המלאות באתר</div>
    ` : ''}

  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
