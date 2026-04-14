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
  const cons = review?.cons?.slice(0, 1) ?? [];

  const embedUrl = carModel?.uid
    ? `https://sketchfab.com/models/${carModel.uid}/embed?autostart=1&autospin=0.5&preload=1&ui_infos=0&ui_controls=0&ui_watermark=0&ui_stop=0&ui_ar=0&ui_help=0&ui_settings=0&ui_annotations=0&camera=0`
    : null;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=1080"/>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;700;900&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; font-family: 'Rubik', sans-serif; }

    .scene {
      position: absolute;
      inset: 0;
    }

    /* Full-screen Sketchfab embed */
    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
      background: ${BG};
    }

    /* Dark gradient — transparent top, solid black bottom */
    .gradient-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(10,11,15,0.05) 0%,
        rgba(10,11,15,0.0) 25%,
        rgba(10,11,15,0.15) 50%,
        rgba(10,11,15,0.75) 70%,
        rgba(10,11,15,0.96) 83%,
        rgba(10,11,15,1) 100%
      );
      pointer-events: none;
    }

    /* Branding badge top-left */
    .badge {
      position: absolute;
      top: 52px;
      right: 52px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: ${R};
      border-radius: 99px;
      padding: 10px 22px;
    }
    .badge-dot { width: 10px; height: 10px; border-radius: 50%; background: #fff; flex-shrink: 0; }
    .badge-text { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: 1px; }

    /* Car name — bottom of the 3D area */
    .car-name {
      position: absolute;
      bottom: 780px;
      left: 0; right: 0;
      padding: 0 60px;
    }
    .car-make { font-size: 38px; font-weight: 700; color: ${MUTED}; margin-bottom: 8px; }
    .car-model { font-size: 100px; font-weight: 900; color: #fff; line-height: 1; letter-spacing: -2px; text-shadow: 0 4px 40px rgba(0,0,0,0.8); }

    /* Info section at absolute bottom */
    .info {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      padding: 0 56px 64px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .score-row {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 26px 32px;
      background: rgba(19,21,28,0.9);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.06);
      backdrop-filter: blur(12px);
    }
    .score-circle {
      width: 110px; height: 110px;
      border-radius: 50%;
      border: 4px solid ${scoreColor};
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .score-val { font-size: 44px; font-weight: 900; color: ${scoreColor}; line-height: 1; }
    .score-sub { font-size: 16px; color: ${MUTED}; }
    .score-label { font-size: 26px; font-weight: 800; color: ${TEXT}; }
    .score-desc  { font-size: 20px; color: ${MUTED}; line-height: 1.35; margin-top: 4px; }

    .fact-card {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 20px 26px;
      background: rgba(19,21,28,0.88);
      border-radius: 0 18px 18px 0;
      border-right: 6px solid var(--accent);
      backdrop-filter: blur(12px);
    }
    .fact-icon { font-size: 30px; color: var(--accent); flex-shrink: 0; line-height: 1; }
    .fact-text { font-size: 26px; font-weight: 700; color: ${TEXT}; line-height: 1.3; }
  </style>
</head>
<body>
<div class="scene">

  ${embedUrl
    ? `<iframe src="${embedUrl}" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${CARD};">
         <img src="${make.logoUrl}" style="width:500px;height:500px;object-fit:contain;opacity:0.15;" alt=""/>
       </div>`
  }

  <div class="gradient-overlay"></div>

  <!-- Branding badge -->
  <div class="badge">
    <div class="badge-dot"></div>
    <span class="badge-text">carissues.co.il</span>
  </div>

  <!-- Car name overlay -->
  <div class="car-name">
    <div class="car-make">${make.nameHe}</div>
    <div class="car-model">${model.nameHe}</div>
  </div>

  <!-- Info section -->
  <div class="info">

    ${score !== null ? `
    <div class="score-row">
      <div class="score-circle">
        <div class="score-val">${score.toFixed(1)}</div>
        <div class="score-sub">מתוך 10</div>
      </div>
      <div>
        <div class="score-label">ניקוד נהגים</div>
        <div class="score-desc">על בסיס ביקורות אמיתיות<br/>של נהגים ישראלים</div>
      </div>
    </div>` : ''}

    ${pros.map(p => `
    <div class="fact-card" style="--accent:${GREEN}">
      <span class="fact-icon">✓</span>
      <span class="fact-text">${p}</span>
    </div>`).join('')}

    ${cons.map(c => `
    <div class="fact-card" style="--accent:${R}">
      <span class="fact-icon">✗</span>
      <span class="fact-text">${c}</span>
    </div>`).join('')}

  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
