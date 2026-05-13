import { getAllMakes } from '@/lib/carsDb';

export const revalidate = 86400;

export async function GET() {
  const makes = await getAllMakes().catch(() => []);

  const brandLines = makes.flatMap((m) => [
    `### ${m.nameHe} (${m.nameEn})`,
    `- Brand page: https://carissues.co.il/cars/${m.slug}`,
    ...m.models.map(
      (mo) =>
        `- [${m.nameHe} ${mo.nameHe}](https://carissues.co.il/cars/${m.slug}/${mo.slug}): Owner reviews, issues, recalls, repair costs — ${mo.years[mo.years.length - 1]}–${mo.years[0]}`,
    ),
    '',
  ]);

  const content = `# CarIssues Israel — ביקורות רכב ובעיות נפוצות

> Israeli car reviews platform (content in Hebrew / עברית). Aggregates real owner reviews, common problems, safety recalls, repair cost estimates, and trim pricing for cars sold in Israel.

## About

CarIssues.co.il helps Israeli car buyers make informed decisions by publishing:
- Genuine owner reviews (rating 1–5, mileage, year, trim)
- AI-generated expert summaries based on Israeli and international owner forums
- Common problems and reliability issues reported by owners
- NHTSA + Israeli safety recall alerts
- Real repair cost data from owners (broken down by repair type and workshop type)
- Trim-level specs and prices in ILS (₪)

All content is in Hebrew. The site covers ${makes.length} car brands and ${makes.reduce((s, m) => s + m.models.length, 0)} models currently on sale or recently discontinued in Israel.

## Key Pages

- [כל היצרנים / All Brands](https://carissues.co.il/cars): Full list of brands with owner reviews
- [השוואת רכבים / Car Compare](https://carissues.co.il/cars/compare): Side-by-side comparison of any two models
- [דירוג רכבים / Rankings](https://carissues.co.il/rankings): Models ranked by average owner rating
- [עלויות תיקון / Repair Costs](https://carissues.co.il/repairs): Common repair types and cost estimates in Israel

## Per-Model Page Structure

Each model page at https://carissues.co.il/cars/{make}/{model} includes:
1. Average owner rating + review count
2. AI expert review (pros, cons, Israeli forum summary, global forum summary, score out of 10)
3. Year-by-year owner reviews with text, rating, mileage, trim
4. Common issues section (/issues sub-page)
5. Safety recalls
6. Repair cost estimates from owners
7. Trim specs and prices

## Car Brands & Models

${brandLines.join('\n')}
`.trimEnd();

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
