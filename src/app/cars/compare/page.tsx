import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllMakes } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { getModelPriceMins } from '@/lib/trimSpecsDb';
import { resolvePairs, type ResolvedPair } from '@/lib/comparePairs';
import { TOP_COMPARE_PAIRS } from '@/data/top-compare-pairs';
import { SEARCHED_COMPARE_PAIRS } from '@/data/searched-compare-pairs';
import { CompareClient } from './CompareClient';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const langs = { he: 'https://carissues.co.il/cars/compare', en: 'https://carissues.net/cars/compare', 'x-default': 'https://carissues.net/cars/compare' };
  return locale === 'en' ? {
    title: 'Compare Cars — Price, Reliability & Owner Reviews',
    description: 'Compare any two cars side by side: trim prices, specs, owner reviews, recalls and common problems — with a clear verdict for each pair.',
    alternates: { canonical: `${base}/cars/compare`, languages: langs },
  } : {
    // Over ~65 chars with the "| CarIssues" suffix, so the suffix is dropped.
    title: { absolute: 'השוואת רכבים — השוו כל שני דגמים (מחיר, אמינות, ביקורות)' },
    description: 'השוואת רכבים בין כל שני דגמים: מחירון גרסאות בישראל, מפרט, ביקורות בעלים, ריקולים ובעיות נפוצות — עם שורה תחתונה למי מתאים כל רכב.',
    alternates: { canonical: `${base}/cars/compare`, languages: langs },
  };
}

export const revalidate = 86400;

// Additional curated pairs (Israeli market demand) shown under the most-read grid.
const POPULAR_PAIRS = [
  ['toyota/corolla-cross', 'skoda/karoq'], ['toyota/corolla-cross', 'toyota/yaris-cross'], ['toyota/corolla-cross', 'nissan/qashqai'],
  ['toyota/corolla-cross', 'kia/seltos'], ['toyota/corolla-cross', 'mazda/cx5'], ['toyota/corolla-cross', 'volkswagen/tiguan'],
  ['toyota/corolla-cross', 'mazda/cx30'], ['toyota/corolla-cross', 'honda/hrv'], ['toyota/corolla-cross', 'subaru/xv'],
  ['toyota/corolla-cross', 'mitsubishi/asx'], ['toyota/corolla-cross', 'toyota/rav4'], ['toyota/corolla-cross', 'peugeot/2008'],
  ['toyota/corolla-cross', 'opel/grandland'], ['nissan/qashqai', 'kia/sportage'], ['nissan/qashqai', 'hyundai/tucson'],
  ['kia/sportage', 'hyundai/tucson'], ['hyundai/tucson', 'mazda/cx5'], ['kia/sportage', 'mazda/cx5'], ['hyundai/elantra', 'toyota/corolla'],
  ['kia/cerato', 'toyota/corolla'], ['hyundai/i30', 'volkswagen/golf'], ['kia/ceed', 'volkswagen/golf'], ['hyundai/i30', 'skoda/octavia'],
  ['kia/sorento', 'hyundai/santa-fe'], ['kia/sorento', 'toyota/rav4'], ['hyundai/santa-fe', 'toyota/rav4'], ['hyundai/kona', 'nissan/juke'],
  ['hyundai/kona', 'mazda/cx3'], ['hyundai/tucson', 'volkswagen/tiguan'], ['skoda/kodiaq', 'volkswagen/tiguan'], ['nissan/x-trail', 'hyundai/tucson'],
  ['nissan/x-trail', 'kia/sportage'], ['skoda/karoq', 'volkswagen/troc'], ['peugeot/3008', 'volkswagen/tiguan'], ['peugeot/3008', 'kia/sportage'],
  ['subaru/forester', 'toyota/rav4'], ['mitsubishi/eclipse-cross', 'nissan/qashqai'], ['honda/crv', 'mazda/cx5'], ['honda/crv', 'toyota/rav4'],
  ['toyota/yaris-cross', 'kia/stonic'], ['toyota/yaris-cross', 'nissan/juke'], ['toyota/yaris-cross', 'hyundai/kona'], ['toyota/chr', 'kia/stonic'],
  ['kia/stonic', 'hyundai/bayon'], ['kia/stonic', 'nissan/juke'], ['hyundai/bayon', 'seat/arona'], ['volkswagen/troc', 'seat/arona'],
  ['ford/puma', 'nissan/juke'], ['opel/mokka', 'peugeot/2008'], ['kia/niro', 'hyundai/kona'], ['kia/ev6', 'hyundai/ioniq-5'],
  ['kia/ev6', 'tesla/model-3'], ['hyundai/ioniq-6', 'tesla/model-3'], ['volkswagen/id4', 'hyundai/ioniq-5'], ['volkswagen/id4', 'kia/ev6'],
  ['volkswagen/id3', 'hyundai/ioniq-6'], ['toyota/bz4x', 'hyundai/ioniq-5'], ['toyota/bz4x', 'volkswagen/id4'], ['nissan/leaf', 'volkswagen/id3'],
  ['lexus/ux', 'toyota/chr'], ['toyota/prius', 'toyota/corolla'], ['mazda/cx30', 'toyota/chr'], ['dacia/duster', 'renault/arkana'],
  ['dacia/duster', 'kia/stonic'], ['dacia/sandero', 'kia/picanto'], ['suzuki/vitara', 'dacia/duster'], ['suzuki/swift', 'hyundai/i20'],
  ['fiat/tipo', 'hyundai/i20'],
] as const;

const CATEGORY_ENTRIES = [
  { key: 'suv', dbCats: ['suv'], he: 'רכבי SUV וקרוסאובר', en: 'SUVs & crossovers', links: [{ href: '/cars/category/suv', he: 'כל רכבי ה-SUV', en: 'All SUVs' }] },
  { key: 'family', dbCats: ['sedan'], he: 'משפחתיות (סדאן)', en: 'Family cars (sedans)', links: [{ href: '/cars/category/sedan', he: 'כל דגמי הסדאן', en: 'All sedans' }] },
  { key: 'small', dbCats: ['hatchback'], he: "קטנות והאצ'בק", en: 'Small cars & hatchbacks', links: [{ href: '/cars/category/hatchback', he: "כל דגמי ההאצ'בק", en: 'All hatchbacks' }] },
  { key: 'ev', dbCats: ['electric'], he: 'חשמליות והיברידיות', en: 'Electric & hybrid', links: [{ href: '/cars/category/electric', he: 'כל החשמליות', en: 'All EVs' }, { href: '/cars/category/hybrid', he: 'כל ההיברידיות', en: 'All hybrids' }] },
] as const;

const BUDGET_BANDS = [
  { min: 0, max: 150_000, he: 'עד ₪150,000', en: 'Up to ₪150,000' },
  { min: 150_000, max: 200_000, he: '₪150,000–₪200,000', en: '₪150,000–₪200,000' },
  { min: 200_000, max: 300_000, he: '₪200,000–₪300,000', en: '₪200,000–₪300,000' },
  { min: 300_000, max: Infinity, he: 'מעל ₪300,000', en: 'Over ₪300,000' },
] as const;

const cardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--surface-2)',
  border: '1px solid var(--border)', borderRadius: 10, textDecoration: 'none', fontSize: '0.875rem', color: 'var(--text)',
};

export default async function ComparePage() {
  const [locale, makes, priceMins] = await Promise.all([
    getHostLocale(),
    getAllMakes().catch(() => []),
    getModelPriceMins().catch(() => new Map<string, number>()),
  ]);
  const isEn = locale === 'en';
  const cmp = translations[locale].comparePage;
  const base = getBaseUrl(locale);
  const label = (p: ResolvedPair, side: 'a' | 'b') => {
    const s = p[side];
    return isEn ? `${s.make.nameEn} ${s.model.nameEn}` : `${s.make.nameHe} ${s.model.nameHe}`;
  };

  const topPairs = resolvePairs(makes, TOP_COMPARE_PAIRS);
  const pool = resolvePairs(makes, [...TOP_COMPARE_PAIRS, ...SEARCHED_COMPARE_PAIRS, ...POPULAR_PAIRS]);
  const topPaths = new Set(topPairs.map((p) => p.path));
  const morePairs = pool.filter((p) => !topPaths.has(p.path));

  const modelCount = makes.reduce((s, m) => s + m.models.length, 0);
  const categoryBlocks = CATEGORY_ENTRIES.map((c) => {
    const inCat = (p: ResolvedPair) => (c.dbCats as readonly string[]).includes(p.a.model.category) && (c.dbCats as readonly string[]).includes(p.b.model.category);
    const count = makes.reduce((s, m) => s + m.models.filter((mo) => (c.dbCats as readonly string[]).includes(mo.category)).length, 0);
    return { ...c, count, pairs: pool.filter(inCat).slice(0, 4) };
  }).filter((c) => c.count > 0);
  const budgetBlocks = BUDGET_BANDS.map((b) => {
    const inBand = (key: string) => { const p = priceMins.get(key); return p != null && p >= b.min && p < b.max; };
    const count = [...priceMins.keys()].filter(inBand).length;
    return { ...b, count, pairs: pool.filter((p) => inBand(p.a.key) && inBand(p.b.key)).slice(0, 4) };
  }).filter((b) => b.pairs.length > 0);

  const PairLink = ({ p }: { p: ResolvedPair }) => (
    <Link href={p.path} style={cardStyle}>
      <span style={{ fontWeight: 600 }}>{label(p, 'a')}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>{isEn ? 'vs' : 'מול'}</span>
      <span style={{ fontWeight: 600 }}>{label(p, 'b')}</span>
    </Link>
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : 'בית', item: base },
          { '@type': 'ListItem', position: 2, name: cmp.title, item: `${base}/cars/compare` },
        ],
      },
      {
        '@type': 'ItemList',
        name: isEn ? 'Most-read car comparisons' : 'ההשוואות הנקראות ביותר',
        itemListElement: topPairs.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${label(p, 'a')} ${isEn ? 'vs' : 'מול'} ${label(p, 'b')}`,
          url: `${base}${p.path}`,
        })),
      },
    ],
  };

  return (
    <>
      <div className="container" style={{ paddingTop: 32 }}>
        {/* Breadcrumb + H1 are server-rendered (the picker below is client-only) */}
        <nav aria-label={isEn ? 'Breadcrumb' : 'פירורי לחם'} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isEn ? 'Home' : 'בית'}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{cmp.breadcrumb}</span>
        </nav>
        <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)', fontWeight: 900, marginBottom: 6 }}>{isEn ? 'Car comparison' : 'השוואת רכבים'}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.9375rem' }}>{cmp.subtitle}</p>
      </div>

      {/* Two-car picker — first interactive element */}
      <CompareClient showHeader={false} />

      <div className="container" style={{ paddingBottom: 64 }}>
        {/* Intro — template copy, counts are live */}
        <section style={{ maxWidth: 820, marginBottom: 36, fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
          {isEn ? (
            <>
              <p style={{ margin: '0 0 10px' }}>Compare any two of the {modelCount} models from {makes.length} brands on CarIssues. Each comparison puts side by side the Israeli trim prices, key specs (power, fuel consumption, boot space), owner reviews from this site, recalls recorded by NHTSA and an AI summary of what owners write on forums.</p>
              <p style={{ margin: '0 0 10px' }}>How to use it: pick a make and model in both boxes above to open the full comparison page — with a short verdict on who each car suits, common questions and links to both model pages. You can also start from one of the most-read comparisons below, or browse by body type or price range.</p>
              <p style={{ margin: 0 }}>Data is refreshed regularly. When we don&apos;t have a figure for one of the models, the comparison simply leaves it out.</p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 10px' }}>בעמוד הזה אפשר להשוות בין כל שני דגמים מתוך {modelCount} דגמים של {makes.length} יצרנים שנמכרים או נמכרו בישראל. כל השוואה מציגה זה לצד זה את מחירון הגרסאות בישראל, נתוני מפרט (הספק, צריכת דלק, נפח תא מטען), ביקורות של בעלי רכב באתר, ריקולים שמתועדים במאגר NHTSA, וסיכום AI של מה שבעלי רכב כותבים בפורומים.</p>
              <p style={{ margin: '0 0 10px' }}>איך משתמשים: בוחרים יצרן ודגם בשני השדות למעלה ועוברים לדף ההשוואה המלא — עם שורה תחתונה למי מתאים כל רכב, שאלות נפוצות וקישורים לדפי שני הדגמים. אפשר גם להתחיל מאחת ההשוואות הנקראות ביותר למטה, או לבחור לפי סוג רכב או טווח מחיר.</p>
              <p style={{ margin: 0 }}>הנתונים מתעדכנים מעת לעת. כשאין לנו נתון מסוים על אחד הדגמים, ההשוואה פשוט לא מציגה אותו.</p>
            </>
          )}
        </section>

        {topPairs.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 16 }}>{isEn ? 'Most-read comparisons' : 'ההשוואות הנקראות ביותר'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {topPairs.map((p) => <PairLink key={p.path} p={p} />)}
            </div>
          </section>
        )}

        {categoryBlocks.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 16 }}>{isEn ? 'Compare by body type' : 'השוואה לפי סוג רכב'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {categoryBlocks.map((c) => (
                <div key={c.key} className="card" style={{ padding: '16px 18px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 4px' }}>{isEn ? c.en : c.he}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    {isEn ? `${c.count} models` : `${c.count} דגמים`} · {c.links.map((l, i) => (
                      <span key={l.href}>{i > 0 && ' · '}<Link href={l.href} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{isEn ? l.en : l.he}</Link></span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {c.pairs.map((p) => <PairLink key={p.path} p={p} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {budgetBlocks.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6 }}>{isEn ? 'Compare by starting price' : 'השוואה לפי מחיר התחלתי'}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
              {isEn ? 'Based on the lowest Israeli trim price on file for each model.' : 'לפי המחיר הנמוך ביותר במחירון הגרסאות שבאתר לכל דגם.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {budgetBlocks.map((b) => (
                <div key={b.he} className="card" style={{ padding: '16px 18px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 4px' }}>{isEn ? b.en : b.he}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>{isEn ? `${b.count} models with a price on file` : `${b.count} דגמים עם מחיר במאגר`}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {b.pairs.map((p) => <PairLink key={p.path} p={p} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {morePairs.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 16 }}>{cmp.popularPairs}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {morePairs.map((p) => <PairLink key={p.path} p={p} />)}
            </div>
          </section>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
