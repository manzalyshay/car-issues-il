import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { getAllMakes } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import stats from '@/data/fleetStats.json';

// Snapshot of the Ministry of Transport active-vehicle registry, rebuilt with
// scripts/fleet-stats-fetch.mjs + scripts/fleet-stats-build.mjs.
export const revalidate = 86400;

const PATH = '/israel-car-stats';
const YEAR = Number(stats.fetchedAt.slice(0, 4));
const pct = (n: number, d: number, digits = 1) => `${((n / d) * 100).toFixed(digits)}%`;
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const COUNTRY: Record<string, [string, string]> = {
  JP: ['יפן', 'Japan'], KR: ['דרום קוריאה', 'South Korea'], CZ: ["צ'כיה", 'Czechia'], CN: ['סין', 'China'],
  TR: ['טורקיה', 'Turkey'], ES: ['ספרד', 'Spain'], DE: ['גרמניה', 'Germany'], FR: ['צרפת', 'France'],
  GB: ['בריטניה', 'United Kingdom'], TH: ['תאילנד', 'Thailand'], SK: ['סלובקיה', 'Slovakia'], HU: ['הונגריה', 'Hungary'],
  US: ['ארצות הברית', 'United States'], IN: ['הודו', 'India'], MX: ['מקסיקו', 'Mexico'], RO: ['רומניה', 'Romania'],
  IT: ['איטליה', 'Italy'], SE: ['שבדיה', 'Sweden'], XX: ['אחר', 'Other'],
};
const COLOR: Record<string, [string, string, string]> = {
  white: ['לבן', 'White', '#f4f4f0'], silver: ['כסף', 'Silver', '#c3c7cc'], gray: ['אפור', 'Gray', '#7d838a'],
  black: ['שחור', 'Black', '#1c1d1f'], blue: ['כחול', 'Blue', '#2f6fd0'], brown: ["חום / בז' / ברונזה", 'Brown / beige / bronze', '#a98a66'],
  red: ['אדום', 'Red', '#c93434'], green: ['ירוק', 'Green', '#3d8f5a'], orange: ['כתום', 'Orange', '#e8822a'],
  purple: ['סגול / ורוד', 'Purple / pink', '#8a56b5'], yellow: ['צהוב', 'Yellow', '#e7c62d'], other: ['אחר / לא ידוע', 'Other / unknown', '#b9b3a8'],
};
const OWN: Record<string, [string, string]> = {
  private: ['פרטי', 'Private'], leasing: ['ליסינג', 'Leasing'], company: ['חברה', 'Company'],
  dealer: ['סוחר', 'Dealer'], rental: ['השכרה', 'Rental'],
};
const FUEL: Record<string, [string, string]> = {
  petrol: ['בנזין (כולל היברידי רגיל)', 'Petrol (incl. regular hybrids)'], diesel: ['דיזל', 'Diesel'],
  ev: ['חשמלי מלא', 'Battery electric'], phev: ['פלאג-אין היברידי', 'Plug-in hybrid'], lpg: ['גפ"מ', 'LPG'],
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const isEn = locale === 'en';
  const total = stats.total.toLocaleString('en-US');
  const title = isEn
    ? `How Many Cars Are in Israel? ${YEAR} Fleet Statistics`
    : `כמה רכבים יש בישראל? נתוני צי הרכב ${YEAR}`;
  const description = isEn
    ? `${total} cars on Israel's roads, counted from the official registry: most common makes, models and colours, EV and plug-in share, Chinese brands, fleet age and monthly registrations.`
    : `${total} רכבים על הכביש בישראל, לפי מאגר משרד התחבורה: היצרנים והדגמים הנפוצים, כמה רכבים חשמליים, הצבעים הפופולריים, נתח המותגים הסיניים, גיל הרכבים ומסירות חודשיות.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${base}${PATH}`,
      languages: { he: `https://carissues.co.il${PATH}`, en: `https://carissues.net${PATH}`, 'x-default': `https://carissues.net${PATH}` },
    },
    openGraph: { title, description, url: `${base}${PATH}`, type: 'article' },
  };
}

// ── Presentational helpers ───────────────────────────────────────────────────
const h2: CSSProperties = { fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px' };
const lead: CSSProperties = { color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.7, fontSize: '0.95rem' };
const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontWeight: 700, whiteSpace: 'nowrap' };

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="card" style={{ padding: 20, marginBottom: 20, scrollMarginTop: 80 }}>
      <h2 style={h2}>{title}</h2>
      {intro && <p style={lead}>{intro}</p>}
      {children}
    </section>
  );
}

interface BarRow { label: ReactNode; value: number; note?: string; color?: string }
function Bars({ rows, max, fmt, rank }: { rows: BarRow[]; max?: number; fmt: (n: number) => string; rank?: boolean }) {
  const top = max ?? Math.max(...rows.map((r) => r.value));
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
      {rows.map((r, i) => (
        <li key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2px 12px', alignItems: 'baseline' }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.95rem' }}>
            {rank && <span style={{ color: 'var(--text-muted)', display: 'inline-block', minWidth: 26, fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>}
            {r.label}
          </span>
          <span style={{ ...num, fontSize: '0.9rem' }}>
            {fmt(r.value)}{r.note && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {r.note}</span>}
          </span>
          <span style={{ gridColumn: '1 / -1', height: 8, background: 'var(--bg-muted)', borderRadius: 4, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.max(1, (r.value / top) * 100)}%`, background: r.color ?? 'var(--accent)', borderRadius: 4 }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Columns({ cols, height = 150 }: { cols: { key: string; title: string; parts: { v: number; color: string }[]; tick?: string }[]; height?: number }) {
  const max = Math.max(...cols.map((c) => c.parts.reduce((s, p) => s + p.v, 0)));
  return (
    <div dir="ltr" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, minWidth: cols.length * 9 }}>
        {cols.map((c) => (
          <div key={c.key} title={c.title} style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', height: '100%' }}>
            {c.parts.map((p, i) => (
              <div key={i} style={{ height: `${(p.v / max) * 100}%`, background: p.color, borderRadius: i === c.parts.length - 1 ? '2px 2px 0 0' : 0 }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 2, minWidth: cols.length * 9, marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        {cols.map((c) => <div key={c.key} style={{ flex: 1, textAlign: 'center', overflow: 'visible', whiteSpace: 'nowrap' }}>{c.tick ?? ''}</div>)}
      </div>
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>
      {items.map(([color, label]) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />{label}
        </span>
      ))}
    </div>
  );
}

export default async function IsraelCarStatsPage() {
  const locale = await getHostLocale();
  const isEn = locale === 'en';
  const base = getBaseUrl(locale);
  const L = (he: string, en: string) => (isEn ? en : he);
  const fmt = (n: number) => n.toLocaleString(isEn ? 'en-US' : 'he-IL');
  const total = stats.total;
  const updated = new Date(stats.fetchedAt).toLocaleDateString(isEn ? 'en-GB' : 'he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Link registry brands / nameplates to the site's own pages where they exist.
  const makes = await getAllMakes().catch(() => []);
  const makeByName = new Map<string, (typeof makes)[number]>();
  for (const m of makes) {
    makeByName.set(norm(m.nameEn), m);
    makeByName.set(norm(m.slug), m);
  }
  const findMake = (en: string) => makeByName.get(norm(en)) ?? makeByName.get(norm(en.split(/[\s-]/)[0]));
  const brandLabel = (b: { en: string; he: string }) => {
    const m = findMake(b.en);
    const text = isEn ? b.en : (m?.nameHe ?? b.he);
    return m ? <Link href={`/cars/${m.slug}`} style={{ color: 'inherit', fontWeight: 600 }}>{text}</Link> : <span style={{ fontWeight: 600 }}>{text}</span>;
  };
  const brandHe = (en: string) => findMake(en)?.nameHe ?? stats.brands.find((b) => b.en === en)?.he ?? en;
  const findModel = (r: { brand: string; key: string }) => {
    const mk = findMake(r.brand);
    if (!mk) return null;
    const mkNorm = norm(mk.nameEn);
    const hit = mk.models.find((mo) => {
      const n = norm(mo.nameEn);
      return n === r.key || (n.startsWith(mkNorm) && n.slice(mkNorm.length) === r.key) || norm(mo.slug) === r.key;
    });
    return hit ? { mk, hit } : null;
  };
  const modelText = (r: { brand: string; model: string; key: string }) => {
    const f = findModel(r);
    if (f) return isEn ? `${f.mk.nameEn} ${f.hit.nameEn}` : `${f.mk.nameHe} ${f.hit.nameHe}`;
    return `${isEn ? r.brand : brandHe(r.brand)} ${r.model}`;
  };
  const modelLabel = (r: { brand: string; model: string; key: string }) => {
    const f = findModel(r);
    if (!f) return <span style={{ fontWeight: 600 }}>{modelText(r)}</span>;
    return <Link href={`/cars/${f.mk.slug}/${f.hit.slug}`} style={{ color: 'inherit', fontWeight: 600 }}>{modelText(r)}</Link>;
  };

  const ev = stats.fuel.ev, phev = stats.fuel.phev;
  const topBrand = stats.brands[0], topModel = stats.models[0];
  const white = stats.colors.find((c) => c.c === 'white')!.n;
  const cnBrands = stats.origins.find((o) => o.c === 'CN')!.n;
  const latest = stats.byYear[stats.byYear.length - 1];
  const evPeak = stats.byYear.reduce((a, b) => (b.ev / b.n > a.ev / a.n ? b : a));
  const tesla = stats.brands.find((b) => b.en === 'Tesla');
  const byd = stats.brands.find((b) => b.en === 'BYD');
  const months = stats.months;
  const lastFullYear = YEAR - 1;
  const sumYear = (y: number) => months.filter((m) => m.m.startsWith(String(y))).reduce((s, m) => s + m.n, 0);

  const tiles: [string, string, string][] = [
    [fmt(total), L('רכבים פעילים על הכביש', 'active cars on the road'), L('פרטיים ומסחריים קלים', 'private and light commercial')],
    [fmt(ev), L('רכבים חשמליים', 'battery-electric cars'), pct(ev, total) + L(' מהצי', ' of the fleet')],
    [fmt(phev), L('פלאג-אין היברידיים', 'plug-in hybrids'), pct(phev, total) + L(' מהצי', ' of the fleet')],
    [pct(white, total, 0), L('מהרכבים בצבע לבן', 'of all cars are white'), L('הצבע הנפוץ בישראל', "Israel's most common colour")],
    [String(stats.age.avg), L('שנים - גיל רכב ממוצע', 'years - average car age'), pct(stats.age.over10, total, 0) + L(' בני 10 שנים ומעלה', ' are 10+ years old')],
    [pct(latest.cn, latest.n, 0), L(`מרכבי שנתון ${latest.y} ממותג סיני`, `of ${latest.y} model-year cars are Chinese brands`), pct(cnBrands, total) + L(' מכלל הצי', ' of the whole fleet')],
  ];

  const faqs: [string, string][] = isEn ? [
    ['How many cars are there in Israel?', `As of ${updated}, Israel's Ministry of Transport registry lists ${fmt(total)} active private and light commercial vehicles. The figure excludes motorcycles, trucks over 3.5 tonnes, buses and vehicles that were taken off the road.`],
    ['What is the most common car in Israel?', `The ${topModel.brand} ${topModel.model} is the most common car on Israeli roads with ${fmt(topModel.n)} registered, followed by the ${stats.models[1].brand} ${stats.models[1].model} (${fmt(stats.models[1].n)}) and the ${stats.models[2].brand} ${stats.models[2].model} (${fmt(stats.models[2].n)}).`],
    ['Which car brand is the most popular in Israel?', `${topBrand.en} leads with ${fmt(topBrand.n)} cars (${pct(topBrand.n, total)} of the fleet), ahead of ${stats.brands[1].en} (${fmt(stats.brands[1].n)}) and ${stats.brands[2].en} (${fmt(stats.brands[2].n)}).`],
    ['How many electric cars are there in Israel?', `There are ${fmt(ev)} battery-electric cars in Israel, ${pct(ev, total)} of all cars, plus ${fmt(phev)} plug-in hybrids. The best-selling electric car is the ${stats.evModels[0].brand} ${stats.evModels[0].model} with ${fmt(stats.evModels[0].n)} on the road.`],
    ['How many Teslas are there in Israel?', tesla ? `${fmt(tesla.n)} Teslas are registered in Israel. The Model 3 (${fmt(stats.evModels.find((m) => m.brand === 'Tesla' && m.key === 'MODEL3')?.n ?? 0)}) is more common than the Model Y (${fmt(stats.evModels.find((m) => m.brand === 'Tesla' && m.key === 'MODELY')?.n ?? 0)}).${byd ? ` BYD has overtaken Tesla with ${fmt(byd.ev)} electric cars.` : ''}` : ''],
    ['What is the most popular car colour in Israel?', `White. ${fmt(white)} cars - ${pct(white, total, 0)} of the fleet - are white, followed by silver, gray and black.`],
    ['How old is the average car in Israel?', `The average car on the road is about ${stats.age.avg} years old by model year. ${fmt(stats.age.over10)} cars (${pct(stats.age.over10, total, 0)}) are at least 10 years old and ${fmt(stats.age.over15)} are 15 or older.`],
    ['How many Chinese cars are there in Israel?', `${fmt(cnBrands)} cars from Chinese brands are on Israeli roads (${pct(cnBrands, total)} of the fleet). Among ${latest.y} model-year cars their share is already ${pct(latest.cn, latest.n, 0)}.`],
  ] : [
    ['כמה רכבים יש בישראל?', `נכון ל-${updated} רשומים במאגר משרד התחבורה ${fmt(total)} רכבים פעילים, פרטיים ומסחריים קלים. המספר לא כולל אופנועים, משאיות מעל 3.5 טון, אוטובוסים ורכבים שירדו מהכביש.`],
    ['מה הרכב הנפוץ ביותר בישראל?', `${modelText(topModel)} הוא הרכב הנפוץ ביותר בישראל עם ${fmt(topModel.n)} רכבים על הכביש. אחריו ${modelText(stats.models[1])} (${fmt(stats.models[1].n)}) ו${modelText(stats.models[2])} (${fmt(stats.models[2].n)}).`],
    ['איזה יצרן רכב הכי נפוץ בישראל?', `${brandHe(topBrand.en)} מובילה עם ${fmt(topBrand.n)} רכבים (${pct(topBrand.n, total)} מהצי), לפני ${brandHe(stats.brands[1].en)} (${fmt(stats.brands[1].n)}) ו${brandHe(stats.brands[2].en)} (${fmt(stats.brands[2].n)}).`],
    ['כמה רכבים חשמליים יש בישראל?', `בישראל ${fmt(ev)} רכבים חשמליים מלאים, שהם ${pct(ev, total)} מכלל הרכבים, ועוד ${fmt(phev)} רכבי פלאג-אין היברידיים. הרכב החשמלי הנפוץ ביותר הוא ${modelText(stats.evModels[0])} עם ${fmt(stats.evModels[0].n)} רכבים.`],
    ['כמה טסלות יש בישראל?', tesla ? `בישראל רשומות ${fmt(tesla.n)} טסלות. מודל 3 (${fmt(stats.evModels.find((m) => m.brand === 'Tesla' && m.key === 'MODEL3')?.n ?? 0)}) נפוץ יותר ממודל Y (${fmt(stats.evModels.find((m) => m.brand === 'Tesla' && m.key === 'MODELY')?.n ?? 0)}).${byd ? ` BYD כבר עקפה את טסלה עם ${fmt(byd.ev)} רכבים חשמליים.` : ''}` : ''],
    ['מה צבע הרכב הנפוץ ביותר בישראל?', `לבן. ${fmt(white)} רכבים, ${pct(white, total, 0)} מהצי, צבועים בלבן. אחריו כסף, אפור ושחור.`],
    ['מה הגיל הממוצע של רכב בישראל?', `הרכב הממוצע על הכביש הוא בן כ-${stats.age.avg} שנים לפי שנת הייצור. ${fmt(stats.age.over10)} רכבים (${pct(stats.age.over10, total, 0)}) בני 10 שנים ומעלה, ו-${fmt(stats.age.over15)} בני 15 ומעלה.`],
    ['כמה רכבים סיניים יש בישראל?', `${fmt(cnBrands)} רכבים של מותגים סיניים נוסעים בישראל (${pct(cnBrands, total)} מהצי). בקרב רכבי שנתון ${latest.y} הנתח שלהם כבר ${pct(latest.cn, latest.n, 0)}.`],
  ];

  const url = `${base}${PATH}`;
  const title = L(`כמה רכבים יש בישראל? נתוני צי הרכב ${YEAR}`, `How many cars are in Israel? ${YEAR} fleet statistics`);
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Dataset',
      name: L(`נתוני צי הרכב בישראל ${YEAR}`, `Israel car fleet statistics ${YEAR}`),
      description: L(
        `ספירה מלאה של ${fmt(total)} הרכבים הפעילים בישראל לפי יצרן, דגם, צבע, סוג הנעה, בעלות, שנת ייצור וארץ ייצור.`,
        `A full count of Israel's ${fmt(total)} active cars by make, model, colour, powertrain, ownership, model year and country of manufacture.`),
      url, inLanguage: isEn ? 'en' : 'he', dateModified: stats.fetchedAt, temporalCoverage: stats.fetchedAt.slice(0, 10),
      spatialCoverage: { '@type': 'Place', name: 'Israel' },
      isBasedOn: `https://data.gov.il/dataset/private-and-commercial-vehicles/resource/${stats.source.resource}`,
      creator: { '@type': 'Organization', name: 'CarIssues', url: base },
      license: 'https://creativecommons.org/licenses/by/4.0/',
      variableMeasured: ['make', 'model', 'colour', 'fuel type', 'ownership type', 'model year', 'country of manufacture'],
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: isEn ? 'en' : 'he',
      mainEntity: faqs.filter(([, a]) => a).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: L('דף הבית', 'Home'), item: base },
        { '@type': 'ListItem', position: 2, name: L('נתוני צי הרכב בישראל', 'Israel car statistics'), item: url },
      ],
    },
  ];

  const toc: [string, string][] = [
    ['makes', L('יצרנים', 'Makes')], ['models', L('דגמים', 'Models')], ['electric', L('חשמליים', 'Electric')],
    ['china', L('מותגים סיניים', 'Chinese brands')], ['colors', L('צבעים', 'Colours')], ['ownership', L('בעלות', 'Ownership')],
    ['age', L('גיל הרכבים', 'Fleet age')], ['monthly', L('מסירות חודשיות', 'Monthly registrations')],
    ['made-in', L('ארץ ייצור', 'Made in')], ['faq', L('שאלות נפוצות', 'FAQ')],
  ];
  const EV_C = '#1f9d6b', PHEV_C = '#7ccfa9', REST_C = 'var(--border)', CN_C = '#d6453d';
  const twoCol: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24 };
  const h3: CSSProperties = { fontSize: '1rem', fontWeight: 700, margin: '0 0 12px' };

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48, maxWidth: 980 }}>
      {jsonLd.map((j, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />)}

      <nav aria-label="breadcrumb" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        <Link href="/" style={{ color: 'inherit' }}>{L('דף הבית', 'Home')}</Link> / {L('נתוני צי הרכב בישראל', 'Israel car statistics')}
      </nav>

      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4.5vw, 2.3rem)', fontWeight: 900, lineHeight: 1.2, margin: '0 0 10px' }}>{title}</h1>
        <p style={{ ...lead, fontSize: '1.02rem', margin: 0 }}>
          {L(
            `ספרנו את כל ${fmt(total)} הרכבים הפעילים במאגר הרישוי של משרד התחבורה, אחד אחד: מי היצרן, איזה דגם, באיזה צבע, מה מניע אותו ומי הבעלים. אלה המספרים המלאים, לא סקר ולא הערכה.`,
            `We counted every one of the ${fmt(total)} active cars in Israel's Ministry of Transport registry: who built it, which model, what colour, what powers it and who owns it. These are full counts, not a survey or an estimate.`,
          )}
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
          {L('עודכן', 'Updated')}: <time dateTime={stats.fetchedAt}>{updated}</time> · {L('מקור', 'Source')}:{' '}
          <a href="https://data.gov.il/dataset/private-and-commercial-vehicles" rel="noopener nofollow" target="_blank" style={{ color: 'inherit', textDecoration: 'underline' }}>
            {L('משרד התחבורה, data.gov.il', 'Ministry of Transport, data.gov.il')}
          </a>
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12, marginBottom: 20 }}>
        {tiles.map(([big, label, sub]) => (
          <div key={label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{big}</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      <nav aria-label={L('תוכן העמוד', 'On this page')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {toc.map(([id, label]) => <a key={id} href={`#${id}`} className="ci-chip">{label}</a>)}
      </nav>

      <Section id="makes" title={L('היצרנים הנפוצים בישראל', 'Most common car makes in Israel')}
        intro={L(
          `${brandHe(topBrand.en)} ו${brandHe(stats.brands[1].en)} לבדן מחזיקות ${pct(topBrand.n + stats.brands[1].n, total, 0)} מהרכבים בישראל. בסך הכול רשומים במאגר ${stats.brandCount} מותגים.`,
          `${topBrand.en} and ${stats.brands[1].en} alone account for ${pct(topBrand.n + stats.brands[1].n, total, 0)} of Israel's cars. The registry lists ${stats.brandCount} brands in total.`)}>
        <Bars rank fmt={fmt} rows={stats.brands.slice(0, 25).map((b) => ({ label: brandLabel(b), value: b.n, note: pct(b.n, total) }))} />
      </Section>

      <Section id="models" title={L('הדגמים הנפוצים בישראל', 'Most common car models in Israel')}
        intro={L(
          `כל הגרסאות של אותו דגם (בנזין, היברידי, סדאן, סטיישן) נספרות יחד. ${modelText(topModel)} מוביל בפער גדול עם ${fmt(topModel.n)} רכבים, אחד מכל ${Math.round(total / topModel.n)} רכבים בארץ.`,
          `All versions of a nameplate (petrol, hybrid, saloon, estate) are counted together. The ${topModel.brand} ${topModel.model} leads by a wide margin with ${fmt(topModel.n)} cars - one in every ${Math.round(total / topModel.n)} cars in the country.`)}>
        <Bars rank fmt={fmt} rows={stats.models.slice(0, 30).map((m) => ({ label: modelLabel(m), value: m.n }))} />
      </Section>

      <Section id="electric" title={L('רכבים חשמליים ופלאג-אין בישראל', 'Electric and plug-in cars in Israel')}
        intro={L(
          `${fmt(ev)} חשמליים מלאים ו-${fmt(phev)} פלאג-אין. נתח החשמליים הגיע לשיא של ${pct(evPeak.ev, evPeak.n, 0)} בשנתון ${evPeak.y}, ומאז הפלאג-אין תופס את מקומם: בשנתון ${latest.y} ${pct(latest.phev, latest.n, 0)} מהרכבים הם פלאג-אין ורק ${pct(latest.ev, latest.n, 0)} חשמליים מלאים. היברידיים רגילים רשומים במאגר כרכבי בנזין.`,
          `${fmt(ev)} battery-electric cars and ${fmt(phev)} plug-in hybrids. The EV share peaked at ${pct(evPeak.ev, evPeak.n, 0)} of model-year ${evPeak.y} cars; since then plug-ins have taken over - ${pct(latest.phev, latest.n, 0)} of ${latest.y} cars are plug-in hybrids and only ${pct(latest.ev, latest.n, 0)} fully electric. Regular hybrids are registered as petrol cars.`)}>
        <h3 style={h3}>{L('נתח מהרכבים לפי שנתון', 'Share of cars by model year')}</h3>
        <Legend items={[[EV_C, L('חשמלי מלא', 'Battery electric')], [PHEV_C, L('פלאג-אין', 'Plug-in hybrid')]]} />
        <Bars fmt={(n) => `${n.toFixed(1)}%`} max={50}
          rows={stats.byYear.filter((y) => y.y >= 2019).map((y) => ({
            label: <span style={{ fontWeight: 600 }}>{y.y}</span>,
            value: ((y.ev + y.phev) / y.n) * 100,
            note: `${L('חשמלי', 'EV')} ${pct(y.ev, y.n, 0)} · ${L('פלאג-אין', 'PHEV')} ${pct(y.phev, y.n, 0)}`,
            color: `linear-gradient(to ${isEn ? 'right' : 'left'}, ${EV_C} ${(y.ev / (y.ev + y.phev)) * 100}%, ${PHEV_C} 0)`,
          }))} />
        <div style={{ ...twoCol, marginTop: 24 }}>
          <div>
            <h3 style={h3}>{L('הרכבים החשמליים הנפוצים', 'Most common electric cars')}</h3>
            <Bars rank fmt={fmt} rows={stats.evModels.slice(0, 12).map((m) => ({ label: modelLabel(m), value: m.n, color: EV_C }))} />
          </div>
          <div>
            <h3 style={h3}>{L('רכבי הפלאג-אין הנפוצים', 'Most common plug-in hybrids')}</h3>
            <Bars rank fmt={fmt} rows={stats.phevModels.map((m) => ({ label: modelLabel(m), value: m.n, color: PHEV_C }))} />
            <h3 style={{ ...h3, marginTop: 24 }}>{L('יצרני החשמליות המובילים', 'Top electric-car brands')}</h3>
            <Bars rank fmt={fmt} rows={stats.evBrands.slice(0, 8).map((b) => ({ label: brandLabel(b), value: b.n, color: EV_C }))} />
          </div>
        </div>
      </Section>

      <Section id="china" title={L('עליית המותגים הסיניים', 'The rise of Chinese brands')}
        intro={L(
          `ב-2020 מותגים סיניים היו פחות מ-1% מהרכבים החדשים. בשנתון ${latest.y} הם כבר ${pct(latest.cn, latest.n, 0)}. בסך הכול ${fmt(cnBrands)} רכבים של מותגים סיניים על הכביש.`,
          `In 2020 Chinese brands were under 1% of new cars. Among ${latest.y} model-year cars they are ${pct(latest.cn, latest.n, 0)}. In total ${fmt(cnBrands)} cars from Chinese brands are on the road.`)}>
        <Bars fmt={(n) => `${n.toFixed(1)}%`} max={50}
          rows={stats.byYear.filter((y) => y.y >= 2019).map((y) => ({
            label: <span style={{ fontWeight: 600 }}>{y.y}</span>, value: (y.cn / y.n) * 100, note: fmt(y.cn), color: CN_C,
          }))} />
        <p style={{ ...lead, margin: '14px 0 0', fontSize: '0.85rem' }}>
          {L('לפי מוצא המותג (BYD, צ\'רי, ג\'אקו, MG, ג\'ילי, אקספנג ועוד), לא לפי מקום הייצור. טסלה שיוצרה בסין לא נספרת כאן.',
            'By brand origin (BYD, Chery, Jaecoo, MG, Geely, Xpeng and others), not by where the car was built. Chinese-built Teslas are not counted here.')}
        </p>
      </Section>

      <Section id="colors" title={L('צבעי הרכב הנפוצים בישראל', 'Most common car colours in Israel')}
        intro={L(
          `${pct(white, total, 0)} מהרכבים בישראל לבנים. לבן, כסף, אפור ושחור יחד הם ${pct(stats.colors.slice(0, 4).reduce((s, c) => s + c.n, 0), total, 0)} מהצי.`,
          `${pct(white, total, 0)} of Israel's cars are white. White, silver, gray and black together make up ${pct(stats.colors.slice(0, 4).reduce((s, c) => s + c.n, 0), total, 0)} of the fleet.`)}>
        <Bars fmt={fmt} rows={stats.colors.map((c) => ({
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: COLOR[c.c][2], border: '1px solid var(--border)', display: 'inline-block' }} />
              {COLOR[c.c][isEn ? 1 : 0]}
            </span>
          ),
          value: c.n, note: pct(c.n, total),
        }))} />
      </Section>

      <Section id="ownership" title={L('של מי הרכבים? בעלות וסוג הנעה', 'Who owns the cars? Ownership and powertrain')}>
        <div style={twoCol}>
          <div>
            <h3 style={h3}>{L('סוג בעלות', 'Ownership type')}</h3>
            <Bars fmt={fmt} rows={Object.entries(stats.ownership).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: <span style={{ fontWeight: 600 }}>{OWN[k]?.[isEn ? 1 : 0] ?? k}</span>, value: n, note: pct(n, total) }))} />
            <h3 style={{ ...h3, marginTop: 24 }}>{L('סוג הנעה', 'Powertrain')}</h3>
            <Bars fmt={fmt} rows={Object.entries(stats.fuel).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: <span style={{ fontWeight: 600 }}>{FUEL[k]?.[isEn ? 1 : 0] ?? k}</span>, value: n, note: pct(n, total) }))} />
          </div>
          <div>
            <h3 style={h3}>{L('הרכבים הנפוצים בליסינג, בחברות ובהשכרה', 'Most common leasing, company and rental cars')}</h3>
            <Bars rank fmt={fmt} rows={stats.fleetModels.map((m) => ({ label: modelLabel(m), value: m.n }))} />
            <p style={{ ...lead, margin: '14px 0 0', fontSize: '0.85rem' }}>
              {L('קונים רכב יד שנייה? ', 'Buying a used car? ')}
              <Link href="/vehicle-lookup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {L('בדקו לפי מספר רישוי אם הרכב היה בליסינג או בהשכרה', 'Check by plate number whether it was a leasing or rental car')}
              </Link>.
            </p>
          </div>
        </div>
      </Section>

      <Section id="age" title={L('גיל הרכבים בישראל', 'How old are Israel\'s cars?')}
        intro={L(
          `גיל ממוצע: ${stats.age.avg} שנים. ${fmt(stats.age.over10)} רכבים (${pct(stats.age.over10, total, 0)}) בני עשר ומעלה, ${fmt(stats.age.over20)} בני עשרים ומעלה. כל עמודה היא שנת ייצור.`,
          `Average age: ${stats.age.avg} years. ${fmt(stats.age.over10)} cars (${pct(stats.age.over10, total, 0)}) are ten or older and ${fmt(stats.age.over20)} are twenty or older. Each column is a model year.`)}>
        <Columns cols={stats.years.filter((y) => y.y >= 2000).map((y) => ({
          key: String(y.y), title: `${y.y}: ${fmt(y.n)}`, parts: [{ v: y.n, color: 'var(--accent)' }], tick: y.y % 5 === 0 ? String(y.y) : '',
        }))} />
        <h3 style={{ ...h3, marginTop: 24 }}>{L('הדגם הנפוץ בכל שנתון', 'Most common model of each model year')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
            <thead>
              <tr style={{ textAlign: 'start', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ textAlign: 'start', padding: '6px 4px' }}>{L('שנתון', 'Model year')}</th>
                <th style={{ textAlign: 'start', padding: '6px 4px' }}>{L('הדגם הנפוץ', 'Top model')}</th>
                <th style={{ textAlign: 'end', padding: '6px 4px' }}>{L('רכבים', 'Cars')}</th>
                <th style={{ textAlign: 'end', padding: '6px 4px' }}>{L('סה"כ בשנתון', 'Year total')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.byYear.slice().reverse().map((y) => (
                <tr key={y.y} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 4px', fontWeight: 700 }}>{y.y}</td>
                  <td style={{ padding: '7px 4px' }}>{modelLabel(y.top)}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'end', ...num }}>{fmt(y.top.n)}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{fmt(y.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="monthly" title={L('רכבים חדשים שעלו לכביש, לפי חודש', 'New cars put on the road, by month')}
        intro={L(
          `ב-${lastFullYear} עלו לכביש ${fmt(sumYear(lastFullYear))} רכבים שעדיין פעילים, לעומת ${fmt(sumYear(lastFullYear - 1))} ב-${lastFullYear - 1}. ינואר הוא תמיד חודש השיא, כי קונים מחכים לשנתון החדש.`,
          `${fmt(sumYear(lastFullYear))} cars that are still active were first registered in ${lastFullYear}, against ${fmt(sumYear(lastFullYear - 1))} in ${lastFullYear - 1}. January is always the peak, because buyers wait for the new model year.`)}>
        <Legend items={[[EV_C, L('חשמלי מלא', 'Battery electric')], [PHEV_C, L('פלאג-אין', 'Plug-in hybrid')], [REST_C, L('בנזין, דיזל והיברידי', 'Petrol, diesel and hybrid')]]} />
        <Columns height={170} cols={months.map((m) => ({
          key: m.m,
          title: `${m.m}: ${fmt(m.n)} · EV ${fmt(m.ev)} · PHEV ${fmt(m.phev)}`,
          parts: [{ v: m.ev, color: EV_C }, { v: m.phev, color: PHEV_C }, { v: m.n - m.ev - m.phev, color: REST_C }],
          tick: m.m.endsWith('-01') ? m.m.slice(0, 4) : '',
        }))} />
        <p style={{ ...lead, margin: '12px 0 0', fontSize: '0.85rem' }}>
          {L('לפי מועד העלייה לכביש של רכבים שעדיין רשומים כפעילים. רכבים שירדו מהכביש מאז אינם נספרים.',
            'Based on the first-registration date of cars still listed as active. Cars taken off the road since are not counted.')}
        </p>
      </Section>

      <Section id="made-in" title={L('איפה מיוצרים הרכבים של ישראל?', 'Where are Israel\'s cars built?')}
        intro={L(
          'ארץ הייצור בפועל, לא מוצא המותג: טויוטה מטורקיה, יונדאי מצ\'כיה וטסלה מסין נספרות לפי המפעל.',
          'Actual country of manufacture, not brand origin: a Turkish-built Toyota, a Czech-built Hyundai and a Chinese-built Tesla are counted by factory.')}>
        <Bars rank fmt={fmt} rows={stats.countries.filter((c) => c.c !== 'XX').slice(0, 14).map((c) => ({
          label: <span style={{ fontWeight: 600 }}>{COUNTRY[c.c]?.[isEn ? 1 : 0] ?? c.c}</span>, value: c.n, note: pct(c.n, total),
        }))} />
      </Section>

      <Section id="faq" title={L('שאלות נפוצות', 'Frequently asked questions')}>
        <div style={{ display: 'grid', gap: 14 }}>
          {faqs.filter(([, a]) => a).map(([q, a]) => (
            <div key={q}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px' }}>{q}</h3>
              <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--text-muted)' }}>{a}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="card" style={{ padding: 20 }}>
        <h2 style={h2}>{L('איך ספרנו, ואיך לצטט', 'How we counted, and how to cite')}</h2>
        <p style={{ ...lead, marginBottom: 10 }}>
          {L(
            `הנתונים מבוססים על מאגר "כלי רכב פרטיים ומסחריים" של משרד התחבורה ב-data.gov.il, שמתעדכן מדי יום. עברנו על כל ${fmt(total)} הרשומות נכון ל-${updated}. איחדנו כתיבים שונים של אותו יצרן (למשל "טויוטה יפן" ו"טויוטה טורקיה") ושל אותו דגם. רכבים היברידיים רגילים רשומים במאגר כבנזין ולכן אינם מופרדים.`,
            `The figures come from the Ministry of Transport's "private and commercial vehicles" registry on data.gov.il, which is updated daily. We went through all ${fmt(total)} records as of ${updated}, merging the different spellings of each make (the registry lists "Toyota Japan" and "Toyota Turkey" separately) and each nameplate. Regular hybrids are registered as petrol and cannot be separated.`)}
        </p>
        <p style={{ ...lead, margin: 0 }}>
          {L('מותר להשתמש בנתונים ובגרפים בכתבות, במצגות ובמחקר, עם קישור למקור: ', 'You are welcome to use these figures in articles, presentations and research with a link to the source: ')}
          <span dir="ltr" style={{ fontWeight: 600 }}>{url.replace('https://', '')}</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          <Link href="/vehicle-lookup" className="ci-chip">{L('בדיקת רכב לפי מספר', 'Check a car by plate')}</Link>
          <Link href="/cars" className="ci-chip">{L('כל היצרנים והדגמים', 'All makes and models')}</Link>
          <Link href="/rankings" className="ci-chip">{L('דירוג אמינות', 'Reliability rankings')}</Link>
        </div>
      </section>
    </div>
  );
}
