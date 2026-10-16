import { headers } from 'next/headers';
import { getAllMakes } from '@/lib/carsDb';
import { resolvePairs } from '@/lib/comparePairs';
import { TOP_COMPARE_PAIRS } from '@/data/top-compare-pairs';

export const revalidate = 86400;

function isEnHost(host: string) {
  return host === 'carissues.net' || host === 'www.carissues.net' || host.startsWith('en.');
}

export async function GET() {
  const host = (await headers()).get('host') ?? '';
  const en = isEnHost(host);
  const base = en ? 'https://carissues.net' : 'https://carissues.co.il';
  const makes = await getAllMakes().catch(() => []);
  const modelCount = makes.reduce((s, m) => s + m.models.length, 0);
  const topPairs = resolvePairs(makes, TOP_COMPARE_PAIRS).slice(0, 15);

  const pairLines = topPairs.map(({ path, a, b }) =>
    en
      ? `- [${a.make.nameEn} ${a.model.nameEn} vs ${b.make.nameEn} ${b.model.nameEn}](${base}${path})`
      : `- [${a.make.nameHe} ${a.model.nameHe} מול ${b.make.nameHe} ${b.model.nameHe}](${base}${path})`,
  );

  const brandLines = makes.flatMap((m) => [
    `### ${en ? m.nameEn : `${m.nameHe} (${m.nameEn})`}`,
    `- ${en ? 'Brand page' : 'עמוד יצרן'}: ${base}/cars/${m.slug}`,
    ...m.models.map((mo) => {
      const range = mo.years.length ? ` — ${mo.years[mo.years.length - 1]}–${mo.years[0]}` : '';
      return en
        ? `- [${m.nameEn} ${mo.nameEn}](${base}/cars/${m.slug}/${mo.slug}): reviews, common problems, recalls${range}`
        : `- [${m.nameHe} ${mo.nameHe}](${base}/cars/${m.slug}/${mo.slug}): ביקורות, בעיות נפוצות, ריקולים${range}`;
    }),
    '',
  ]);

  const content = en
    ? `# CarIssues — Car Reviews, Common Problems & Reliability

> English edition of CarIssues (Hebrew edition: https://carissues.co.il). Owner reviews, AI summaries of owner forums, common problems, safety recalls, trim specs and side-by-side comparisons for ${makes.length} brands and ${modelCount} models.

## Key Pages

- [Car comparison](${base}/cars/compare): compare any two models side by side
- [All brands](${base}/cars)
- [Rankings](${base}/rankings): models ranked by owner and AI scores
- [Repair costs](${base}/repairs)
- [Vehicle lookup](${base}/vehicle-lookup): look up a vehicle by plate

## Most-Read Comparisons

${pairLines.join('\n')}

## Car Brands & Models

${brandLines.join('\n')}
`.trimEnd()
    : `# CarIssues IL — ביקורות רכב, בעיות נפוצות ואמינות

> Israeli car reliability site (Hebrew-first; English edition at https://carissues.net). Owner reviews, AI summaries of Israeli and international owner forums, common problems, safety recalls, repair costs, Israeli trim prices (₪), side-by-side comparisons and a free vehicle lookup by Israeli licence plate (Ministry of Transport data). Covers ${makes.length} brands and ${modelCount} models sold in Israel.

## Key Pages

- [בדיקת רכב לפי מספר רישוי / Vehicle lookup by plate](${base}/vehicle-lookup): free lookup — test, ownership, recalls and technical data from the Ministry of Transport database
- [השוואת רכבים / Car comparison](${base}/cars/compare): compare any two models side by side
- [כל היצרנים / All brands](${base}/cars)
- [דירוג רכבים / Rankings](${base}/rankings): models ranked by owner and AI scores
- [עלויות תיקון / Repair costs](${base}/repairs): repair cost data reported by owners

## Most-Read Comparisons

${pairLines.join('\n')}

## Per-Model Page Structure

Each model page at ${base}/cars/{make}/{model} includes owner reviews (when available), an AI summary of owner forums with pros and cons, common issues (/issues), safety recalls, repair costs, and trim specs and prices.

## Car Brands & Models

${brandLines.join('\n')}
`.trimEnd();

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
