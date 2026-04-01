import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/adminAuth';

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

// ── Groq translation (one call per chunk of 6 recalls) ───────────────────────

interface RecallFields { component: string; summary: string; consequence: string; remedy: string; }

async function translateRecalls(recalls: RecallFields[], apiKey: string): Promise<RecallFields[]> {
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
          {
            role: 'system',
            content:
              'Translate each numbered recall from English to Hebrew. Keep technical automotive terms accurate. ' +
              'Reply ONLY in this exact format:\n[N]\ncomponent: ...\nsummary: ...\nconsequence: ...\nremedy: ...',
          },
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

      const component   = get('component');
      const summary     = get('summary');
      const consequence = get('consequence');
      const remedy      = get('remedy');

      if (component)   out[idx].component   = component;
      if (summary)     out[idx].summary     = summary;
      if (consequence) out[idx].consequence = consequence;
      if (remedy)      out[idx].remedy      = remedy;
    }
    return out;
  } catch {
    return recalls;
  }
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
    const sb = getServiceClient();

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

    // 2. Load already-translated records from DB
    const ids = unique.map(r => r.NHTSACampaignNumber ?? '').filter(Boolean);
    const { data: cached } = await sb
      .from('recalls_cache')
      .select('*')
      .in('id', ids);

    const cacheMap = new Map<string, any>();
    for (const row of cached ?? []) cacheMap.set(row.id, row);

    // 3. Identify which recalls need translation
    const toTranslate = unique.filter(r => {
      const id = r.NHTSACampaignNumber ?? '';
      return id && !cacheMap.has(id);
    });

    // 4. Translate new ones in chunks of 6 and save to DB
    if (toTranslate.length > 0) {
      const apiKey = process.env.GROQ_API_KEY ?? '';
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
        const translated = apiKey ? await translateRecalls(fields, apiKey) : fields;

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
      await sb.from('recalls_cache').upsert(rows, { onConflict: 'id' }).then(
        () => {}, err => console.error('[Recalls cache upsert]', err)
      );
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

    return NextResponse.json({ recalls });
  } catch (err) {
    console.error('[Recalls API]', err);
    return NextResponse.json({ recalls: [] });
  }
}
