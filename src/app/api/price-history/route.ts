import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbFirst, dbRun } from '@/lib/db';

interface PriceRow {
  year: number;
  price_ils: number | null;
  price_ils_min: number | null;
  price_ils_max: number | null;
  price_usd: number | null;
  price_usd_min: number | null;
  price_usd_max: number | null;
}

async function fetchFromGemini(
  makeEn: string,
  modelEn: string,
  locale: 'il' | 'us',
  apiKey: string,
): Promise<{ year: number; avg: number; min: number; max: number }[] | null> {
  const prompt = locale === 'il'
    ? `Return ONLY a JSON array, no markdown, no explanation. Average used car market prices in Israel (ILS) for ${makeEn} ${modelEn} by model year, sourced from Yad2. Cover years the model was sold (2016-2025). Format: [{"year":2016,"avg":65000,"min":55000,"max":78000}]`
    : `Return ONLY a JSON array, no markdown, no explanation. Average used car market prices in USD for ${makeEn} ${modelEn} by model year, based on CarGurus/KBB. Cover years the model was sold (2016-2025). Format: [{"year":2016,"avg":15000,"min":12000,"max":18000}]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 1024 },
        }),
      },
    );
    if (!res.ok) {
      console.error('[price-history] Gemini error', res.status, await res.text());
      return null;
    }
    const data = await res.json() as Record<string, unknown>;
    const candidates = data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
    const raw = candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const json = raw.replace(/```[a-z]*\n?/g, '').trim();
    const parsed = JSON.parse(json) as unknown[];
    if (!Array.isArray(parsed)) return null;
    return (parsed as { year?: number; avg?: number; min?: number; max?: number }[])
      .filter(p => p.year && p.avg && p.min && p.max)
      .map(p => ({ year: p.year!, avg: p.avg!, min: p.min!, max: p.max! }));
  } catch (e) {
    console.error('[price-history] Gemini parse error', e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const makeSlug  = searchParams.get('make') ?? '';
  const modelSlug = searchParams.get('model') ?? '';
  const makeEn    = searchParams.get('makeEn') ?? '';
  const modelEn   = searchParams.get('modelEn') ?? '';
  const locale    = (searchParams.get('locale') ?? 'il') as 'il' | 'us';

  if (!makeSlug || !modelSlug) {
    return NextResponse.json({ error: 'Missing make/model' }, { status: 400 });
  }

  // 1. Check D1 cache
  const cached = await dbAll<PriceRow>(
    'SELECT year, price_ils, price_ils_min, price_ils_max, price_usd, price_usd_min, price_usd_max FROM car_price_history WHERE make_slug = ? AND model_slug = ? ORDER BY year',
    makeSlug, modelSlug,
  ).catch(() => [] as PriceRow[]);

  const hasIls = cached.some(r => r.price_ils != null);
  const hasUsd = cached.some(r => r.price_usd_min != null);

  if (locale === 'il' && hasIls) {
    return NextResponse.json({ points: cached }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  }

  // For US locale: if we have ILS data but no USD, convert ILS÷3.7
  if (locale === 'us' && !hasUsd && hasIls) {
    const ILS_TO_USD = 3.7;
    const converted = cached
      .filter(r => r.price_ils != null)
      .map(r => ({
        year: r.year,
        price_ils:     r.price_ils,
        price_ils_min: r.price_ils_min,
        price_ils_max: r.price_ils_max,
        price_usd:     Math.round(r.price_ils! / ILS_TO_USD),
        price_usd_min: r.price_ils_min != null ? Math.round(r.price_ils_min / ILS_TO_USD) : null,
        price_usd_max: r.price_ils_max != null ? Math.round(r.price_ils_max / ILS_TO_USD) : null,
      }));
    return NextResponse.json({ points: converted }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  }

  if (locale === 'us' && hasUsd) {
    return NextResponse.json({ points: cached }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  }

  // 2. Fetch from Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || !makeEn || !modelEn) {
    console.error('[price-history] No Gemini key or missing make/model names');
    return NextResponse.json({ points: cached });
  }

  const aiData = await fetchFromGemini(makeEn, modelEn, locale, geminiKey);
  if (!aiData || aiData.length === 0) {
    console.error('[price-history] Gemini returned no data');
    return NextResponse.json({ points: cached });
  }

  // 3. Upsert into D1 — merge with existing row to preserve other locale's data
  for (const p of aiData) {
    const existing = await dbFirst<PriceRow>(
      'SELECT * FROM car_price_history WHERE make_slug=? AND model_slug=? AND year=?',
      makeSlug, modelSlug, p.year,
    ).catch(() => null);

    if (locale === 'il') {
      if (existing) {
        await dbRun(
          'UPDATE car_price_history SET price_ils=?, price_ils_min=?, price_ils_max=?, source=? WHERE make_slug=? AND model_slug=? AND year=?',
          p.avg, p.min, p.max, 'ai-yad2', makeSlug, modelSlug, p.year,
        ).catch(() => {});
      } else {
        await dbRun(
          'INSERT INTO car_price_history (make_slug,model_slug,year,price_ils,price_ils_min,price_ils_max,source) VALUES (?,?,?,?,?,?,?)',
          makeSlug, modelSlug, p.year, p.avg, p.min, p.max, 'ai-yad2',
        ).catch(() => {});
      }
    } else {
      if (existing) {
        await dbRun(
          'UPDATE car_price_history SET price_usd=?, price_usd_min=?, price_usd_max=?, source=? WHERE make_slug=? AND model_slug=? AND year=?',
          p.avg, p.min, p.max, 'ai-kbb', makeSlug, modelSlug, p.year,
        ).catch(() => {});
      } else {
        await dbRun(
          'INSERT INTO car_price_history (make_slug,model_slug,year,price_usd,price_usd_min,price_usd_max,source) VALUES (?,?,?,?,?,?,?)',
          makeSlug, modelSlug, p.year, p.avg, p.min, p.max, 'ai-kbb',
        ).catch(() => {});
      }
    }
  }

  // 4. Return fresh data
  const fresh = await dbAll<PriceRow>(
    'SELECT year, price_ils, price_ils_min, price_ils_max, price_usd, price_usd_min, price_usd_max FROM car_price_history WHERE make_slug = ? AND model_slug = ? ORDER BY year',
    makeSlug, modelSlug,
  ).catch(() => aiData.map(p => ({
    year: p.year,
    price_ils:     locale === 'il' ? p.avg : null,
    price_ils_min: locale === 'il' ? p.min : null,
    price_ils_max: locale === 'il' ? p.max : null,
    price_usd:     locale === 'us' ? p.avg : null,
    price_usd_min: locale === 'us' ? p.min : null,
    price_usd_max: locale === 'us' ? p.max : null,
  })));

  return NextResponse.json({ points: fresh }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  });
}
