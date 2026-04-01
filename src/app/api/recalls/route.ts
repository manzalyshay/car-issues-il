import { NextRequest, NextResponse } from 'next/server';

export interface Recall {
  id: string;
  year: number | null;
  date: string;        // formatted as DD/MM/YYYY
  component: string;   // translated to Hebrew
  summary: string;     // translated to Hebrew
  consequence: string; // translated to Hebrew
  remedy: string;      // translated to Hebrew
  manufacturer: string;
}

// ── Groq translation ──────────────────────────────────────────────────────────

async function translateBatch(texts: string[]): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || texts.length === 0) return texts;

  // Build a numbered list so we can parse back
  const numbered = texts.map((t, i) => `[${i + 1}] ${t}`).join('\n\n');

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0,
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content:
              'You are a translator. Translate each numbered text from English to Hebrew. ' +
              'Keep technical automotive terms accurate. ' +
              'Reply ONLY with the same numbered format, e.g.:\n[1] תרגום\n[2] תרגום\n...',
          },
          { role: 'user', content: numbered },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return texts;
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';

    // Parse [N] answer pairs
    const out = [...texts]; // fallback = original
    for (const match of content.matchAll(/\[(\d+)\]\s*([\s\S]*?)(?=\n\[\d+\]|$)/g)) {
      const idx = parseInt(match[1]) - 1;
      const translated = match[2].trim();
      if (idx >= 0 && idx < out.length && translated) out[idx] = translated;
    }
    return out;
  } catch {
    return texts;
  }
}

// ── Date formatting ───────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return '';
  // NHTSA format: "20231015" (YYYYMMDD) or ISO strings
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    const yyyy = digits.slice(0, 4);
    const mm   = digits.slice(4, 6);
    const dd   = digits.slice(6, 8);
    return `${dd}/${mm}/${yyyy}`;
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

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make  = searchParams.get('make');
  const model = searchParams.get('model');
  const yearParam = searchParams.get('year');

  if (!make || !model) {
    return NextResponse.json({ error: 'Missing make/model' }, { status: 400 });
  }

  try {
    let rawRecalls: any[] = [];

    if (yearParam) {
      // Single year
      const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${yearParam}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        rawRecalls = data.results ?? [];
      }
    } else {
      // All years — NHTSA returns all recalls when modelYear is omitted
      const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (res.ok) {
        const data = await res.json();
        rawRecalls = data.results ?? [];
      }
    }

    // Deduplicate by campaign number
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const r of rawRecalls) {
      const id = r.NHTSACampaignNumber ?? `${r.ReportReceivedDate}-${r.Component}`;
      if (!seen.has(id)) { seen.add(id); unique.push(r); }
    }

    // Sort newest first
    unique.sort((a, b) => {
      const da = new Date(a.ReportReceivedDate ?? '').getTime();
      const db = new Date(b.ReportReceivedDate ?? '').getTime();
      return db - da;
    });

    // Build field arrays for batch translation
    const components   = unique.map(r => r.Component   ?? '');
    const summaries    = unique.map(r => r.Summary      ?? '');
    const consequences = unique.map(r => r.Consequence  ?? '');
    const remedies     = unique.map(r => r.Remedy       ?? '');

    // Translate all fields in 4 parallel batch calls
    const [tComponents, tSummaries, tConsequences, tRemedies] = await Promise.all([
      translateBatch(components),
      translateBatch(summaries),
      translateBatch(consequences),
      translateBatch(remedies),
    ]);

    const recalls: Recall[] = unique.map((r, i) => ({
      id:           r.NHTSACampaignNumber ?? `${i}`,
      year:         r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
      date:         formatDate(r.ReportReceivedDate ?? ''),
      component:    tComponents[i]   || components[i],
      summary:      tSummaries[i]    || summaries[i],
      consequence:  tConsequences[i] || consequences[i],
      remedy:       tRemedies[i]     || remedies[i],
      manufacturer: r.Manufacturer   ?? '',
    }));

    return NextResponse.json({ recalls });
  } catch (err) {
    console.error('[Recalls API]', err);
    return NextResponse.json({ recalls: [] });
  }
}
