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
  const pros = review?.pros?.slice(0, 3) ?? [];
  const cons = review?.cons?.slice(0, 3) ?? [];

  // Fetch Sketchfab thumbnail
  let thumbnailUrl: string | null = null;
  if (carModel?.uid) {
    try {
      const res = await fetch(`https://api.sketchfab.com/v3/models/${carModel.uid}`, { next: { revalidate: 3600 } });
      const data = await res.json();
      thumbnailUrl = (data.thumbnails?.images ?? []).sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url ?? null;
    } catch { /* no thumbnail */ }
  }

  // 1080×1920 — top 55% car image, bottom 45% info
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=1080"/>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;700;900&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Rubik', sans-serif; background: ${BG}; width: 1080px; height: 1920px; overflow: hidden; }
  </style>
</head>
<body>
<div style="width:1080px;height:1920px;display:flex;flex-direction:column;position:relative;">

  <!-- ── TOP: Car image (55%) ──────────────────────────────── -->
  <div style="width:1080px;height:1056px;position:relative;flex-shrink:0;overflow:hidden;background:${CARD};">
    ${thumbnailUrl
      ? `<img src="${thumbnailUrl}" style="width:100%;height:100%;object-fit:cover;" alt=""/>
         <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,11,15,0.2) 0%,rgba(10,11,15,0.85) 100%);"></div>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
           <img src="${make.logoUrl}" style="width:400px;height:400px;object-fit:contain;opacity:0.3;" alt=""/>
         </div>
         <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(10,11,15,0.95) 100%);"></div>`
    }

    <!-- Car name overlay at bottom of image -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:50px 60px 44px;">
      <!-- Site badge -->
      <div style="display:inline-flex;align-items:center;gap:10px;background:${R};border-radius:99px;padding:8px 20px;margin-bottom:28px;">
        <div style="width:10px;height:10px;border-radius:50%;background:#fff;flex-shrink:0;"></div>
        <span style="font-size:24px;font-weight:700;color:#fff;letter-spacing:1px;">carissues.co.il</span>
      </div>
      <!-- Make name -->
      <div style="font-size:36px;font-weight:700;color:${MUTED};margin-bottom:10px;">${make.nameHe}</div>
      <!-- Model name -->
      <div style="font-size:96px;font-weight:900;color:#fff;line-height:1;letter-spacing:-2px;text-shadow:0 4px 30px rgba(0,0,0,0.8);">${model.nameHe}</div>
    </div>
  </div>

  <!-- ── BOTTOM: Info (45%) ─────────────────────────────────── -->
  <div style="flex:1;display:flex;flex-direction:column;padding:52px 60px 60px;gap:28px;background:${BG};">

    <!-- Score row -->
    ${score !== null ? `
    <div style="display:flex;align-items:center;gap:30px;padding:30px 36px;background:${CARD};border-radius:24px;border:1px solid #1e2130;">
      <div style="width:130px;height:130px;border-radius:50%;border:5px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
        <div style="font-size:50px;font-weight:900;color:${scoreColor};line-height:1;">${score.toFixed(1)}</div>
        <div style="font-size:18px;color:${MUTED};">מתוך 10</div>
      </div>
      <div>
        <div style="font-size:28px;font-weight:900;color:${TEXT};margin-bottom:6px;">ניקוד נהגים</div>
        <div style="font-size:22px;color:${MUTED};line-height:1.4;">על בסיס ביקורות אמיתיות<br/>של נהגים ישראלים</div>
      </div>
    </div>` : ''}

    <!-- Pros -->
    ${pros.slice(0, 2).map(p => `
    <div style="display:flex;align-items:center;gap:20px;padding:24px 30px;background:${CARD};border-right:6px solid ${GREEN};border-radius:0 20px 20px 0;">
      <span style="font-size:34px;color:${GREEN};flex-shrink:0;">✓</span>
      <span style="font-size:28px;font-weight:700;color:${TEXT};line-height:1.3;">${p}</span>
    </div>`).join('')}

    <!-- Cons -->
    ${cons.slice(0, 1).map(c => `
    <div style="display:flex;align-items:center;gap:20px;padding:24px 30px;background:${CARD};border-right:6px solid ${R};border-radius:0 20px 20px 0;">
      <span style="font-size:34px;color:${R};flex-shrink:0;">✗</span>
      <span style="font-size:28px;font-weight:700;color:${TEXT};line-height:1.3;">${c}</span>
    </div>`).join('')}

  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
