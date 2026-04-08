import { NextRequest, NextResponse } from 'next/server';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { findCarModel } from '@/lib/sketchfab';

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

  const [reviews, carModel] = await Promise.all([
    getExpertReviews(makeSlug, modelSlug),
    findCarModel(makeSlug, modelSlug),
  ]);

  const review = reviews[0] ?? null;
  const score = review?.topScore ?? null;
  const scoreColor = score == null ? MUTED : score >= 7.5 ? GREEN : score >= 5.5 ? '#f59e0b' : R;
  const pros = review?.pros?.slice(0, 2) ?? [];
  const cons = review?.cons?.slice(0, 2) ?? [];

  // Fetch Sketchfab thumbnail
  let thumbnailUrl: string | null = null;
  if (carModel?.uid) {
    try {
      const res = await fetch(`https://api.sketchfab.com/v3/models/${carModel.uid}`, { next: { revalidate: 3600 } });
      const data = await res.json();
      thumbnailUrl = (data.thumbnails?.images ?? []).sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url ?? null;
    } catch { /* no thumbnail */ }
  }

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

  <!-- LEFT: 3D thumbnail (full bleed) -->
  <div style="width:520px;height:630px;position:relative;flex-shrink:0;overflow:hidden;background:${CARD};">
    ${thumbnailUrl
      ? `<img src="${thumbnailUrl}" style="width:100%;height:100%;object-fit:cover;" alt=""/>
         <div style="position:absolute;inset:0;background:linear-gradient(to left,rgba(10,11,15,0.9) 0%,rgba(10,11,15,0.1) 50%);"></div>
         <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(10,11,15,0.7) 0%,transparent 50%);"></div>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:120px;">🚗</div>`
    }
    <!-- 3D badge -->
    <div style="position:absolute;top:20px;right:20px;background:${R};color:#fff;font-size:15px;font-weight:900;padding:6px 14px;border-radius:99px;letter-spacing:1px;">תלת מימד 3D</div>
    <!-- Car name overlay -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 28px 24px;">
      <div style="font-size:16px;font-weight:700;color:${R};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">carissues.co.il</div>
      <div style="font-size:18px;font-weight:700;color:${MUTED};margin-bottom:4px;">${make.nameHe}</div>
      <div style="font-size:52px;font-weight:900;color:#fff;line-height:1;text-shadow:0 2px 20px rgba(0,0,0,0.9);">${model.nameHe}</div>
    </div>
  </div>

  <!-- RIGHT: Score + Pros/Cons -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:44px 52px 44px 36px;gap:18px;">

    <!-- Score -->
    ${score !== null ? `
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:8px;">
      <div style="width:120px;height:120px;border-radius:50%;border:5px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;background:${CARD};flex-shrink:0;">
        <div style="font-size:46px;font-weight:900;color:${scoreColor};line-height:1;">${score.toFixed(1)}</div>
        <div style="font-size:14px;color:${MUTED};">מתוך 10</div>
      </div>
      <div>
        <div style="font-size:20px;font-weight:700;color:${MUTED};margin-bottom:6px;">ניקוד AI</div>
        <div style="font-size:18px;font-weight:700;color:${TEXT};">על בסיס ביקורות אמיתיות</div>
      </div>
    </div>` : ''}

    ${pros.map(p => `
    <div style="display:flex;align-items:flex-start;gap:14px;background:${CARD};border:1px solid ${GREEN}30;border-radius:14px;padding:16px 20px;">
      <span style="font-size:22px;color:${GREEN};flex-shrink:0;line-height:1.3;">✓</span>
      <span style="font-size:21px;font-weight:700;color:${TEXT};line-height:1.4;">${p}</span>
    </div>`).join('')}

    ${cons.map(c => `
    <div style="display:flex;align-items:flex-start;gap:14px;background:${CARD};border:1px solid ${R}30;border-radius:14px;padding:16px 20px;">
      <span style="font-size:22px;color:${R};flex-shrink:0;line-height:1.3;">✗</span>
      <span style="font-size:21px;font-weight:700;color:${TEXT};line-height:1.4;">${c}</span>
    </div>`).join('')}

  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
