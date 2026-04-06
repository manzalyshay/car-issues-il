import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/adminAuth';
import { getAllMakes } from '@/lib/carsDb';

export const dynamic = 'force-dynamic';

const R = '#e63946';
const BG = '#0a0b0f';
const CARD = '#13151c';
const BORDER = '#1e2130';
const TEXT = '#f0f2f5';
const MUTED = '#6b7280';

async function getTopRanked(limit = 6) {
  const sb = getServiceClient();
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; logoUrl: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, logoUrl: make.logoUrl });

  const [{ data: expertData }, { data: reviewData }] = await Promise.all([
    sb.from('expert_reviews').select('make_slug,model_slug,top_score').is('year', null).not('top_score', 'is', null),
    sb.from('reviews').select('make_slug,model_slug,rating'),
  ]);

  const scoreMap = new Map<string, number>();
  for (const row of expertData ?? []) scoreMap.set(`${row.make_slug}/${row.model_slug}`, row.top_score);
  const reviewMap = new Map<string, number[]>();
  for (const row of reviewData ?? []) {
    const key = `${row.make_slug}/${row.model_slug}`;
    if (!reviewMap.has(key)) reviewMap.set(key, []);
    reviewMap.get(key)!.push(row.rating);
  }

  const ranked: { key: string; combined: number; reviewCount: number }[] = [];
  for (const [key] of lookup) {
    const score = scoreMap.get(key) ?? null;
    const ratings = reviewMap.get(key) ?? [];
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const scores: number[] = [];
    if (score != null) scores.push(score);
    if (avg != null) scores.push(avg * 2);
    if (!scores.length) continue;
    ranked.push({ key, combined: scores.reduce((a, b) => a + b) / scores.length, reviewCount: ratings.length });
  }
  ranked.sort((a, b) => b.combined - a.combined);
  return ranked.slice(0, limit).map((r, i) => ({ ...r, ...lookup.get(r.key)!, rank: i + 1 }));
}

function carRow(car: { makeHe: string; modelHe: string; logoUrl: string; combined: number; reviewCount: number }, i: number) {
  const pct = Math.round((car.combined / 10) * 100);
  const isTop = i < 3;
  const medals = ['🥇', '🥈', '🥉', '4', '5', '6'];
  return `
    <div style="background:${CARD};border:1px solid ${isTop ? R + '55' : BORDER};border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;">
      <div style="font-size:${i < 3 ? 24 : 16}px;font-weight:900;color:${i < 3 ? '#ffd700' : MUTED};width:32px;text-align:center;flex-shrink:0;">${medals[i]}</div>
      <img src="${car.logoUrl}" alt="" style="width:36px;height:36px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'"/>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:15px;color:${TEXT};margin-bottom:6px;">${car.makeHe} ${car.modelHe}</div>
        <div style="height:6px;background:${BORDER};border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${isTop ? `linear-gradient(to left,${R},#ff6b6b)` : '#374151'};border-radius:99px;"></div>
        </div>
        ${car.reviewCount > 0 ? `<div style="font-size:11px;color:${MUTED};margin-top:4px;">${car.reviewCount} ביקורות</div>` : ''}
      </div>
      <div style="font-size:20px;font-weight:900;color:${isTop ? R : TEXT};flex-shrink:0;">${car.combined.toFixed(1)}</div>
    </div>`;
}

export async function GET() {
  const cars = await getTopRanked(6);

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

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
      <div>
        <div style="font-size:13px;font-weight:600;color:${R};letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">carissues.co.il</div>
        <h1 style="font-size:27px;font-weight:900;color:${TEXT};line-height:1.3;">🚗 הרכבים שמובילים את הטבלה השבוע – הכי אמינים, הכי בטוחים, הכי מומלצים!</h1>
      </div>
      <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:10px 18px;text-align:left;">
        <div style="font-size:11px;color:${MUTED};margin-bottom:2px;">מבוסס על</div>
        <div style="font-size:16px;font-weight:800;color:${TEXT};">ביקורות אמיתיות + AI</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;">
      ${cars.map((car, i) => carRow(car, i)).join('')}
    </div>

    <div style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:12px;color:${MUTED};">הדירוג מבוסס על סיכומי AI + ביקורות בעלי רכב בישראל</div>
      <div style="font-size:13px;font-weight:700;color:${R};">carissues.co.il ←</div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
