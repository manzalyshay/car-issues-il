/**
 * GET /api/cron/refresh-recalls
 *
 * Checks for NHTSA recalls not yet in recalls_cache and translates + saves them.
 * Called by Vercel Cron (daily) or GitHub Actions.
 * Protected by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/adminAuth';

function formatDate(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return raw;
}

function extractYear(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 4) {
    const yr = parseInt(digits.slice(0, 4));
    if (yr > 1980 && yr <= new Date().getFullYear() + 1) return yr;
  }
  return null;
}

interface RecallFields { component: string; summary: string; consequence: string; remedy: string; }

async function translateChunk(recalls: RecallFields[], apiKey: string): Promise<RecallFields[]> {
  if (recalls.length === 0) return recalls;
  const input = recalls.map((r, i) =>
    `[${i + 1}]\ncomponent: ${r.component}\nsummary: ${r.summary}\nconsequence: ${r.consequence}\nremedy: ${r.remedy}`
  ).join('\n\n');

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: 8000,
        messages: [
          { role: 'system', content: 'Translate each numbered recall from English to Hebrew. Keep technical automotive terms accurate. Reply ONLY in this exact format:\n[N]\ncomponent: ...\nsummary: ...\nconsequence: ...\nremedy: ...' },
          { role: 'user', content: input },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return recalls;
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const out = recalls.map(r => ({ ...r }));
    const blocks = content.split(/\n(?=\[\d+\])/);
    for (const block of blocks) {
      const idxMatch = block.match(/^\[(\d+)\]/);
      if (!idxMatch) continue;
      const idx = parseInt(idxMatch[1]) - 1;
      if (idx < 0 || idx >= out.length) continue;
      const get = (field: string) => {
        const m = block.match(new RegExp(`${field}:\\s*([\\s\\S]*?)(?=\\n(?:component|summary|consequence|remedy):|$)`));
        return m?.[1]?.trim() || '';
      };
      const c = get('component'), s = get('summary'), con = get('consequence'), rem = get('remedy');
      if (c)   out[idx].component   = c;
      if (s)   out[idx].summary     = s;
      if (con) out[idx].consequence = con;
      if (rem) out[idx].remedy      = rem;
    }
    return out;
  } catch { return recalls; }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY ?? '';
  const sb = getServiceClient();

  const [{ data: makes }, { data: models }] = await Promise.all([
    sb.from('car_makes').select('slug, name_en'),
    sb.from('car_models').select('make_slug, name_en, years'),
  ]);

  const makeNameMap = Object.fromEntries((makes ?? []).map((m: any) => [m.slug, m.name_en]));
  const { data: existing } = await sb.from('recalls_cache').select('id');
  const cachedIds = new Set((existing ?? []).map((r: any) => r.id));

  let totalNew = 0;

  for (const model of (models ?? []) as any[]) {
    const makeEn  = makeNameMap[model.make_slug] || model.make_slug;
    const modelEn = model.name_en;
    const years   = model.years || [];

    const batches = await Promise.all(
      years.map(async (y: number) => {
        try {
          const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(makeEn)}&model=${encodeURIComponent(modelEn)}&modelYear=${y}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) return [];
          return (await r.json()).results ?? [];
        } catch { return []; }
      })
    );

    const seen = new Set<string>();
    const toTranslate: any[] = [];
    for (const r of batches.flat()) {
      const id = r.NHTSACampaignNumber;
      if (!id || seen.has(id) || cachedIds.has(id)) continue;
      seen.add(id);
      toTranslate.push(r);
    }

    if (toTranslate.length === 0) continue;

    const CHUNK = 6;
    const rows: any[] = [];
    for (let i = 0; i < toTranslate.length; i += CHUNK) {
      const chunk = toTranslate.slice(i, i + CHUNK);
      const fields: RecallFields[] = chunk.map(r => ({
        component: r.Component ?? '', summary: r.Summary ?? '',
        consequence: r.Consequence ?? '', remedy: r.Remedy ?? '',
      }));
      const translated = apiKey ? await translateChunk(fields, apiKey) : fields;
      for (let j = 0; j < chunk.length; j++) {
        const r = chunk[j]; const t = translated[j];
        rows.push({
          id: r.NHTSACampaignNumber, make: makeEn.toLowerCase(), model: modelEn.toLowerCase(),
          date: formatDate(r.ReportReceivedDate ?? ''),
          component_he: t.component || fields[j].component,
          summary_he: t.summary || fields[j].summary,
          consequence_he: t.consequence || fields[j].consequence,
          remedy_he: t.remedy || fields[j].remedy,
          manufacturer: r.Manufacturer ?? '',
          recall_year: r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
        });
        cachedIds.add(r.NHTSACampaignNumber);
      }
    }

    if (rows.length > 0) {
      await sb.from('recalls_cache').upsert(rows, { onConflict: 'id' });
      totalNew += rows.length;
    }
  }

  return NextResponse.json({ ok: true, newRecalls: totalNew });
}
