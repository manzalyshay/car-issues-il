import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

function canonicalKey(m1: string, mo1: string, m2: string, mo2: string) {
  const [a, b] = [`${m1}/${mo1}`, `${m2}/${mo2}`].sort();
  return { id: `${a}__${b}`, a, b };
}

async function generateComparison(
  nameA_he: string, nameB_he: string,
  nameA_en: string, nameB_en: string,
  locale: 'he' | 'en',
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const prompt = locale === 'he'
    ? `כתוב השוואה קצרה ומרוכזת בעברית בין ${nameA_he} לבין ${nameB_he}.
כלול:
- לאיזה קהל מתאים כל רכב
- בידול מרכזי בין שני הרכבים
- המלצה כללית — לאיזה נהג כל רכב מתאים יותר

2-3 פסקאות בלבד. טון מקצועי אך נגיש. אל תשתמש בכותרות.`
    : `Write a concise comparison in English between the ${nameA_en} and the ${nameB_en}.
Include:
- Who each car is best suited for
- Key differentiators between the two
- Overall recommendation — which type of driver each suits best

2-3 paragraphs only. Professional but accessible tone. No headings.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = msg.content[0];
    return block.type === 'text' ? block.text.trim() : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make1  = searchParams.get('make1') ?? '';
  const model1 = searchParams.get('model1') ?? '';
  const make2  = searchParams.get('make2') ?? '';
  const model2 = searchParams.get('model2') ?? '';
  const locale = (searchParams.get('locale') ?? 'he') as 'he' | 'en';
  const nameA_he = searchParams.get('nameAhe') ?? '';
  const nameB_he = searchParams.get('nameBhe') ?? '';
  const nameA_en = searchParams.get('nameAen') ?? '';
  const nameB_en = searchParams.get('nameBen') ?? '';

  if (!make1 || !model1 || !make2 || !model2) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const { id } = canonicalKey(make1, model1, make2, model2);

  // Check cache
  const cached = await dbAll<{ comparison_he: string | null; comparison_en: string | null }>(
    'SELECT comparison_he, comparison_en FROM car_comparisons WHERE id = ?', id,
  ).catch(() => []);

  const field = locale === 'he' ? 'comparison_he' : 'comparison_en';
  if (cached.length > 0 && cached[0][field]) {
    return NextResponse.json({ comparison: cached[0][field] }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  }

  // Generate
  if (!nameA_he || !nameB_he) {
    return NextResponse.json({ comparison: null });
  }

  const text = await generateComparison(nameA_he, nameB_he, nameA_en, nameB_en, locale);
  if (!text) return NextResponse.json({ comparison: null });

  // Upsert
  const [ma1, mo1] = (canonicalKey(make1, model1, make2, model2).a).split('/');
  const [ma2, mo2] = (canonicalKey(make1, model1, make2, model2).b).split('/');
  const updateCol = locale === 'he' ? 'comparison_he' : 'comparison_en';
  await dbRun(
    `INSERT INTO car_comparisons (id, make1_slug, model1_slug, make2_slug, model2_slug, ${updateCol})
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET ${updateCol}=excluded.${updateCol}`,
    id, ma1, mo1, ma2, mo2, text,
  ).catch(() => {});

  return NextResponse.json({ comparison: text }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  });
}
