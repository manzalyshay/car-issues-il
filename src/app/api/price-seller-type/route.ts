import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { dbAll, dbRun } from '@/lib/db';

interface SellerRow {
  year: number;
  private_avg: number | null;
  private_min: number | null;
  private_max: number | null;
  dealer_avg: number | null;
  dealer_min: number | null;
  dealer_max: number | null;
}

interface AIPoint {
  year?: number;
  private_avg?: number;
  private_min?: number;
  private_max?: number;
  dealer_avg?: number;
  dealer_min?: number;
  dealer_max?: number;
}

async function fetchFromAI(makeEn: string, modelEn: string, makeSlug: string, modelSlug: string): Promise<SellerRow[]> {
  const ctx = await getCloudflareContext({ async: true });
  const ai = (ctx.env as { AI?: { run: (model: string, opts: unknown) => Promise<{ response?: string }> } }).AI;
  if (!ai) return [];

  const prompt = `Return ONLY a JSON array, no markdown, no explanation.
Used car prices in Israel (ILS, Israeli Shekels) for ${makeEn} ${modelEn} by model year.
Show BOTH private seller prices (Yad2 פרטי) and dealer/agency prices (סוכנות) for years 2016–2025.
Dealers typically charge 10–20% more than private sellers.
Format: [{"year":2020,"private_avg":75000,"private_min":65000,"private_max":85000,"dealer_avg":88000,"dealer_min":78000,"dealer_max":100000}]
Only include years where the model was actually sold in Israel.`;

  try {
    const result = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0,
    });

    const raw = typeof result.response === 'string'
      ? result.response
      : JSON.stringify(result.response);

    const cleaned = raw.replace(/```[a-z]*\n?/g, '').trim();
    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1) return [];

    const parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1)) as AIPoint[];
    if (!Array.isArray(parsed)) return [];

    const valid = parsed.filter(p =>
      p.year && p.private_avg && p.dealer_avg &&
      p.private_avg > 0 && p.dealer_avg > 0
    );

    // Persist to D1
    await Promise.all(valid.map(p =>
      dbRun(
        `INSERT INTO price_seller_type (make_slug, model_slug, year, private_avg, private_min, private_max, dealer_avg, dealer_min, dealer_max)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (make_slug, model_slug, year) DO UPDATE SET
           private_avg=excluded.private_avg, private_min=excluded.private_min, private_max=excluded.private_max,
           dealer_avg=excluded.dealer_avg, dealer_min=excluded.dealer_min, dealer_max=excluded.dealer_max,
           created_at=datetime('now')`,
        makeSlug, modelSlug, p.year!,
        p.private_avg!, p.private_min ?? null, p.private_max ?? null,
        p.dealer_avg!, p.dealer_min ?? null, p.dealer_max ?? null,
      ).catch(() => {})
    ));

    return valid.map(p => ({
      year: p.year!,
      private_avg: p.private_avg!,
      private_min: p.private_min ?? null,
      private_max: p.private_max ?? null,
      dealer_avg: p.dealer_avg!,
      dealer_min: p.dealer_min ?? null,
      dealer_max: p.dealer_max ?? null,
    }));
  } catch (e) {
    console.error('[price-seller-type] AI error', e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const makeSlug  = searchParams.get('make') ?? '';
  const modelSlug = searchParams.get('model') ?? '';
  const makeEn    = searchParams.get('makeEn') ?? '';
  const modelEn   = searchParams.get('modelEn') ?? '';

  if (!makeSlug || !modelSlug) {
    return NextResponse.json({ error: 'Missing make/model' }, { status: 400 });
  }

  // Check D1 cache
  const cached = await dbAll<SellerRow>(
    `SELECT year, private_avg, private_min, private_max, dealer_avg, dealer_min, dealer_max
     FROM price_seller_type
     WHERE make_slug = ? AND model_slug = ?
     ORDER BY year`,
    makeSlug, modelSlug,
  ).catch(() => [] as SellerRow[]);

  if (cached.length >= 3) {
    return NextResponse.json({ points: cached }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  }

  // Not cached — generate via Workers AI
  if (!makeEn || !modelEn) {
    return NextResponse.json({ points: cached });
  }

  const fresh = await fetchFromAI(makeEn, modelEn, makeSlug, modelSlug);
  if (fresh.length === 0) {
    return NextResponse.json({ points: cached });
  }

  return NextResponse.json({ points: fresh }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  });
}
