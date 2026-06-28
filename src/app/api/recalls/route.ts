import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';

export interface Recall {
  id: string;
  year: number | null;
  date: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  manufacturer: string;
}

// ── Date formatting ───────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
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

// ── Translation (Groq → Gemini → Mistral fallback chain) ─────────────────────

interface RecallFields { component: string; summary: string; consequence: string; remedy: string; }

function buildPrompt(input: string): string {
  return (
    'Translate each numbered car recall from English to Hebrew. Keep automotive technical terms accurate. ' +
    'Reply ONLY in this exact format for each recall:\n[N]\ncomponent: ...\nsummary: ...\nconsequence: ...\nremedy: ...\n\n' +
    input
  );
}

function parseTranslationResponse(content: string, recalls: RecallFields[]): RecallFields[] {
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
    const component = get('component'), summary = get('summary');
    const consequence = get('consequence'), remedy = get('remedy');
    if (component)   out[idx].component   = component;
    if (summary)     out[idx].summary     = summary;
    if (consequence) out[idx].consequence = consequence;
    if (remedy)      out[idx].remedy      = remedy;
  }
  return out;
}

async function translateWithGroq(input: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', temperature: 0, max_tokens: 8000,
        messages: [{ role: 'user', content: buildPrompt(input) }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

async function translateWithGemini(input: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(input) }] }], generationConfig: { temperature: 0, maxOutputTokens: 4000 } }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch { return null; }
}

async function translateWithMistral(input: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'mistral-small-latest', temperature: 0, max_tokens: 4000, messages: [{ role: 'user', content: buildPrompt(input) }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

async function translateRecalls(recalls: RecallFields[]): Promise<RecallFields[]> {
  if (recalls.length === 0) return recalls;
  const input = recalls.map((r, i) =>
    `[${i + 1}]\ncomponent: ${r.component}\nsummary: ${r.summary}\nconsequence: ${r.consequence}\nremedy: ${r.remedy}`
  ).join('\n\n');

  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const mistralKey= process.env.MISTRAL_API_KEY;

  const raw = (groqKey    ? await translateWithGroq(input, groqKey)       : null)
           ?? (geminiKey  ? await translateWithGemini(input, geminiKey)   : null)
           ?? (mistralKey ? await translateWithMistral(input, mistralKey) : null);

  if (!raw) return recalls;
  return parseTranslationResponse(raw, recalls);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make       = searchParams.get('make');
  const model      = searchParams.get('model');
  const yearParam  = searchParams.get('year');
  const yearsParam = searchParams.get('years');

  if (!make || !model) {
    return NextResponse.json({ error: 'Missing make/model' }, { status: 400 });
  }

  try {
    const currentYear = new Date().getFullYear();

    // 1. Fetch raw recalls from NHTSA
    let rawRecalls: any[] = [];
    if (yearParam) {
      const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${yearParam}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) rawRecalls = (await res.json()).results ?? [];
    } else {
      const years = yearsParam
        ? yearsParam.split(',').map(y => y.trim()).filter(Boolean)
        : Array.from({ length: 10 }, (_, i) => String(currentYear - i));
      const batches = await Promise.all(
        years.map(async (y) => {
          try {
            const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${y}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) return [];
            return (await res.json()).results ?? [];
          } catch { return []; }
        })
      );
      rawRecalls = batches.flat();
    }

    // Deduplicate + sort newest first
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const r of rawRecalls) {
      const id = r.NHTSACampaignNumber ?? `${r.ReportReceivedDate}-${r.Component}`;
      if (!seen.has(id)) { seen.add(id); unique.push(r); }
    }
    unique.sort((a, b) =>
      new Date(b.ReportReceivedDate ?? '').getTime() - new Date(a.ReportReceivedDate ?? '').getTime()
    );

    if (unique.length === 0) return NextResponse.json({ recalls: [] });

    // 2. Load already-translated records from DB (skip if stored in English — will re-translate)
    const ids = unique.map(r => r.NHTSACampaignNumber ?? '').filter(Boolean);
    const allCached = ids.length > 0
      ? await dbAll(`SELECT * FROM recalls_cache WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids).catch(() => [])
      : [];
    // Only use cache entries that have Hebrew text
    const hasHebrew = (s: string) => /[\u0590-\u05FF]/.test(s ?? '');
    const cached = allCached.filter((row: any) => hasHebrew(row.summary_he) || hasHebrew(row.component_he));

    const cacheMap = new Map<string, any>();
    for (const row of cached) cacheMap.set(row.id as string, row);

    // 3. Identify which recalls need translation
    const toTranslate = unique.filter(r => {
      const id = r.NHTSACampaignNumber ?? '';
      return id && !cacheMap.has(id);
    });

    // 4. Translate new ones in chunks of 6 and save to DB
    if (toTranslate.length > 0) {
      const CHUNK = 6;
      const rows: any[] = [];

      for (let i = 0; i < toTranslate.length; i += CHUNK) {
        const chunk = toTranslate.slice(i, i + CHUNK);
        const fields: RecallFields[] = chunk.map(r => ({
          component:   r.Component   ?? '',
          summary:     r.Summary     ?? '',
          consequence: r.Consequence ?? '',
          remedy:      r.Remedy      ?? '',
        }));
        const translated = await translateRecalls(fields);

        for (let j = 0; j < chunk.length; j++) {
          const r = chunk[j];
          const t = translated[j];
          const row = {
            id:            r.NHTSACampaignNumber,
            make:          make.toLowerCase(),
            model:         model.toLowerCase(),
            date:          formatDate(r.ReportReceivedDate ?? ''),
            component_he:  t.component   || fields[j].component,
            summary_he:    t.summary     || fields[j].summary,
            consequence_he:t.consequence || fields[j].consequence,
            remedy_he:     t.remedy      || fields[j].remedy,
            manufacturer:  r.Manufacturer ?? '',
            recall_year:   r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
          };
          rows.push(row);
          cacheMap.set(row.id, row);
        }
      }

      // Upsert new rows (fire-and-forget errors)
      for (const row of rows) {
        dbRun(
          `INSERT OR REPLACE INTO recalls_cache (id, make, model, date, component_he, summary_he, consequence_he, remedy_he, manufacturer, recall_year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          row.id, row.make, row.model, row.date,
          row.component_he, row.summary_he, row.consequence_he, row.remedy_he,
          row.manufacturer, row.recall_year,
        ).catch(err => console.error('[Recalls cache upsert]', err));
      }
    }

    // 5. Build final response from cache
    const recalls: Recall[] = unique
      .filter(r => r.NHTSACampaignNumber)
      .map(r => {
        const cached = cacheMap.get(r.NHTSACampaignNumber);
        return {
          id:          r.NHTSACampaignNumber,
          year:        r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
          date:        cached?.date || formatDate(r.ReportReceivedDate ?? ''),
          component:   cached?.component_he  || r.Component   || '',
          summary:     cached?.summary_he    || r.Summary     || '',
          consequence: cached?.consequence_he || r.Consequence || '',
          remedy:      cached?.remedy_he     || r.Remedy      || '',
          manufacturer:r.Manufacturer ?? '',
        };
      });

    return NextResponse.json({ recalls }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (err) {
    console.error('[Recalls API]', err);
    return NextResponse.json({ recalls: [] });
  }
}
