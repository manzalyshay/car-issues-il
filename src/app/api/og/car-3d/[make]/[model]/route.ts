import { NextRequest, NextResponse } from 'next/server';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { findCarModel } from '@/lib/sketchfab';

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

  const [reviews, carModel] = await Promise.all([
    getExpertReviews(makeSlug, modelSlug),
    findCarModel(makeSlug, modelSlug),
  ]);

  const review = reviews[0] ?? null;
  const summary = review?.localSummaryHe ?? review?.globalSummaryHe ?? null;
  const excerpt = summary ? summary.slice(0, 180) + (summary.length > 180 ? '...' : '') : null;
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
    } catch { /* no 3D thumbnail */ }
  }

  const prosHtml = pros.map(p => `
    <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">
      <span style="color:${GREEN};font-size:12px;flex-shrink:0;margin-top:1px;">✓</span>
      <span style="font-size:12px;color:${TEXT};line-height:1.4;">${p}</span>
    </div>`).join('');

  const consHtml = cons.map(c => `
    <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">
      <span style="color:${R};font-size:12px;flex-shrink:0;margin-top:1px;">✕</span>
      <span style="font-size:12px;color:${TEXT};line-height:1.4;">${c}</span>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=1200"/>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Rubik',sans-serif;background:${BG};width:1200px;height:630px;overflow:hidden;}</style>
</head>
<body>
  <div style="width:1200px;height:630px;display:flex;position:relative;">

    <!-- Red left accent -->
    <div style="position:absolute;top:0;right:0;width:5px;height:100%;background:linear-gradient(to bottom,${R},#7c1520);z-index:10;"></div>

    <!-- Left: 3D model thumbnail (560px) -->
    <div style="width:560px;height:630px;position:relative;flex-shrink:0;overflow:hidden;background:${CARD};">
      ${thumbnailUrl
        ? `<img src="${thumbnailUrl}" style="width:100%;height:100%;object-fit:cover;" alt=""/>
           <div style="position:absolute;inset:0;background:linear-gradient(to left,rgba(10,11,15,0.85) 0%,rgba(10,11,15,0.1) 60%);"></div>
           <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(10,11,15,0.7) 0%,transparent 50%);"></div>`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:80px;">🚗</div>`
      }
      <!-- Car name overlay at bottom -->
      <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 28px 24px;">
        <div style="font-size:11px;font-weight:700;color:${R};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">סיכום AI · carissues.co.il</div>
        <div style="font-size:34px;font-weight:900;color:#fff;line-height:1.1;text-shadow:0 2px 12px rgba(0,0,0,0.8);">${make.nameHe} ${model.nameHe}</div>
        ${carModel ? `<div style="font-size:11px;color:${MUTED};margin-top:6px;">מודל תלת מימד: ${carModel.name}</div>` : ''}
      </div>
    </div>

    <!-- Right: AI summary panel (640px) -->
    <div style="flex:1;height:630px;display:flex;flex-direction:column;padding:32px 44px 28px 32px;overflow:hidden;">

      <!-- Score circle + make logo -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <img src="${make.logoUrl}" alt="${make.nameEn}" style="width:48px;height:48px;object-fit:contain;" onerror="this.style.display='none'"/>
          <div>
            <div style="font-size:11px;font-weight:700;color:${MUTED};letter-spacing:1.5px;text-transform:uppercase;">ביקורת AI</div>
            <div style="font-size:18px;font-weight:800;color:${TEXT};">${make.nameEn} ${model.nameEn}</div>
          </div>
        </div>
        ${score !== null ? `
        <div style="width:88px;height:88px;border-radius:50%;border:3px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;background:${CARD};flex-shrink:0;">
          <div style="font-size:28px;font-weight:900;color:${scoreColor};line-height:1;">${score.toFixed(1)}</div>
          <div style="font-size:10px;color:${MUTED};margin-top:1px;">/ 10</div>
        </div>` : ''}
      </div>

      <!-- AI Summary -->
      ${excerpt ? `
      <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:16px 18px;margin-bottom:18px;position:relative;">
        <div style="position:absolute;top:-9px;right:14px;background:${R};color:#fff;font-size:10px;font-weight:700;padding:2px 10px;border-radius:99px;">🤖 סיכום AI</div>
        <p style="font-size:13px;color:${TEXT};line-height:1.7;direction:rtl;">${excerpt}</p>
      </div>` : ''}

      <!-- Pros & Cons -->
      ${(pros.length > 0 || cons.length > 0) ? `
      <div style="display:flex;gap:12px;flex:1;min-height:0;">
        ${pros.length ? `
        <div style="flex:1;background:${CARD};border:1px solid ${GREEN}22;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:700;color:${GREEN};margin-bottom:8px;letter-spacing:0.5px;">יתרונות</div>
          ${prosHtml}
        </div>` : ''}
        ${cons.length ? `
        <div style="flex:1;background:${CARD};border:1px solid ${R}22;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:700;color:${R};margin-bottom:8px;letter-spacing:0.5px;">חסרונות</div>
          ${consHtml}
        </div>` : ''}
      </div>` : ''}

      <!-- Footer -->
      <div style="margin-top:auto;padding-top:16px;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:11px;color:${MUTED};">מבוסס על ביקורות אמיתיות + סיכום AI</div>
        <div style="font-size:12px;font-weight:700;color:${R};">carissues.co.il ←</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
