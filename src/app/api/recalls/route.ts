import { NextRequest, NextResponse } from 'next/server';

export interface Recall {
  id: string;
  date: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  manufacturer: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make  = searchParams.get('make');
  const model = searchParams.get('model');
  const year  = searchParams.get('year');

  if (!make || !model) {
    return NextResponse.json({ error: 'Missing make/model' }, { status: 400 });
  }

  try {
    const years = year
      ? [year]
      : []; // without year: fetch last 10 years

    const currentYear = new Date().getFullYear();
    const yearsToFetch = years.length > 0
      ? years
      : Array.from({ length: 10 }, (_, i) => String(currentYear - i));

    const results = await Promise.all(
      yearsToFetch.map(async (y) => {
        const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${y}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results ?? []) as any[];
      })
    );

    const seen = new Set<string>();
    const recalls: Recall[] = [];

    for (const batch of results) {
      for (const r of batch) {
        const id = r.NHTSACampaignNumber ?? `${r.ReportReceivedDate}-${r.Component}`;
        if (seen.has(id)) continue;
        seen.add(id);
        recalls.push({
          id,
          date: r.ReportReceivedDate ?? '',
          component: r.Component ?? '',
          summary: r.Summary ?? '',
          consequence: r.Consequence ?? '',
          remedy: r.Remedy ?? '',
          manufacturer: r.Manufacturer ?? '',
        });
      }
    }

    // Sort newest first
    recalls.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });

    return NextResponse.json({ recalls });
  } catch (err) {
    console.error('[Recalls API]', err);
    return NextResponse.json({ recalls: [] });
  }
}
