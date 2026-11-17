import type { Metadata } from 'next';
import Link from 'next/link';
import PlateSearch from '@/components/PlateSearch';
import { HE_BASE } from '@/lib/sitemapData';

/**
 * Hebrew landing pages for the plate checks that have their own search intent:
 * open recalls, motorcycles and the disabled parking tag. Each one runs the same
 * plate lookup as /vehicle-lookup; the text explains what that specific check shows.
 * Counts are the row totals of the Ministry of Transport datasets on data.gov.il.
 */

export type PlateCheckKind = 'recall' | 'motorcycle' | 'disabled-tag';

interface Config {
  path: string;
  title: string;
  description: string;
  h1: string;
  kicker: string;
  intro: string;
  facts: { value: string; label: string }[];
  shows: { title: string; desc: string }[];
  /** What the check cannot tell you - stated plainly so nobody relies on it for that. */
  limits: string[];
  faqs: { q: string; a: string }[];
}

const DATA_AS_OF = 'נובמבר 2026';

export const PLATE_CHECKS: Record<PlateCheckKind, Config> = {
  recall: {
    path: '/recall-check',
    title: 'בדיקת ריקול לפי מספר רכב - חינם, לרכב שלכם',
    description: 'בדקו לפי מספר רישוי אם לרכב שלכם יש ריקול (קריאת שירות) שעדיין לא בוצע - תיאור התקלה ותאריך הפתיחה, ישירות ממאגר משרד התחבורה. חינם וללא הרשמה.',
    h1: 'בדיקת ריקול לפי מספר רכב',
    kicker: 'קריאות שירות פתוחות',
    intro: 'הזינו מספר רישוי ותראו אם לרכב הזה עצמו - לא רק לדגם - רשום ריקול שעדיין לא בוצע. התיקון במוסך היבואן אינו עולה כסף.',
    facts: [
      { value: '126,000+', label: 'רשומות של ריקול שלא בוצע במאגר' },
      { value: '0 ₪', label: 'עלות תיקון ריקול אצל היבואן' },
      { value: 'יומי', label: 'תדירות עדכון המאגר הממשלתי' },
    ],
    shows: [
      { title: 'האם יש ריקול פתוח', desc: 'אם משרד התחבורה רשם לרכב שלכם קריאת שירות שלא בוצעה, היא תופיע בראש הדו"ח.' },
      { title: 'מה התקלה', desc: 'תיאור התקלה כפי שנמסר למשרד התחבורה, והתחום שלה - בלמים, מנוע, חשמל, כריות אוויר ועוד.' },
      { title: 'ממתי היא פתוחה', desc: 'תאריך פתיחת הריקול, כדי לדעת כמה זמן הרכב נוסע בלי התיקון.' },
      { title: 'ריקולים לדגם כולו', desc: 'בנוסף לבדיקה לפי לוחית מוצגים כל הריקולים שפורסמו לדגם, בישראל ובארה"ב.' },
    ],
    limits: [
      'ריקול שבוצע כבר אינו מופיע - המאגר כולל רק קריאות שירות פתוחות.',
      'ריקול חדש מאוד עשוי להיכנס למאגר באיחור של כמה ימים. במקרה של ספק, פנו ליבואן עם מספר השלדה.',
    ],
    faqs: [
      { q: 'איך בודקים ריקול לפי מספר רכב?', a: 'מזינים את מספר הרישוי בשדה שבראש העמוד. אם במאגר משרד התחבורה רשום לרכב ריקול שלא בוצע, הוא יוצג עם תיאור התקלה ותאריך הפתיחה. אם אין - יופיע סימון ירוק "אין ריקול פתוח לרכב הזה".' },
      { q: 'כמה עולה תיקון ריקול?', a: 'תיקון ריקול נעשה במוסכי השירות של היבואן ללא תשלום, גם אם הרכב כבר לא באחריות וגם אם קניתם אותו יד שנייה.' },
      { q: 'קניתי רכב יד שנייה - איך אדע אם הבעלים הקודם ביצע את הריקול?', a: 'זו בדיוק הבדיקה: המאגר מפרט כלי רכב שלא ביצעו ריקול, לפי מספר רישוי. אם הרכב לא מופיע בו, אין לו קריאת שירות פתוחה נכון לעדכון האחרון של המאגר.' },
      { q: 'מה ההבדל בין ריקול לדגם לבין ריקול לרכב?', a: 'ריקול לדגם הוא הודעה כללית של היצרן על סדרת רכבים. ריקול לרכב אומר שהרכב המסוים הזה, לפי מספר הרישוי שלו, נכלל בסדרה ועדיין לא תוקן.' },
      { q: 'מה עושים אם נמצא ריקול פתוח?', a: 'מתאמים תור במוסך מורשה של היבואן ומציינים שמדובר בקריאת שירות. לפני קניית רכב משומש כדאי לדרוש מהמוכר לבצע את התיקון או לוודא שאפשר לבצע אותו מיד אחרי ההעברה.' },
    ],
  },
  motorcycle: {
    path: '/motorcycle-check',
    title: 'בדיקת אופנוע לפי מספר רישוי - חינם',
    description: 'בדיקת אופנוע או קטנוע לפי מספר רישוי: יצרן, דגם, שנת ייצור, נפח מנוע, מספר שלדה, מועד עלייה לכביש וסוג הבעלות - ממאגר משרד התחבורה. חינם וללא הרשמה.',
    h1: 'בדיקת אופנוע לפי מספר רישוי',
    kicker: 'אופנועים וקטנועים',
    intro: 'הזינו את מספר הרישוי של האופנוע או הקטנוע וקבלו את הפרטים הרשומים במשרד התחבורה - לפני שאתם נוסעים לראות אותו.',
    facts: [
      { value: '193,000+', label: 'כלי רכב דו-גלגליים במאגר' },
      { value: 'חינם', label: 'ללא הרשמה וללא תשלום' },
      { value: 'שניות', label: 'עד לקבלת הפרטים' },
    ],
    shows: [
      { title: 'יצרן, דגם ושנה', desc: 'מה באמת רשום ברישיון - כדי לוודא שהמודעה מתארת את אותו כלי.' },
      { title: 'נפח מנוע', desc: 'נפח המנוע בסמ"ק, שקובע את דרגת הרישיון הנדרשת ואת עלות הביטוח.' },
      { title: 'מספר שלדה', desc: 'הספרות האחרונות של מספר השלדה, להשוואה מול המספר המוטבע על הכלי.' },
      { title: 'עלייה לכביש ובעלות', desc: 'מתי הכלי עלה לכביש והאם הוא רשום על אדם פרטי או על חברה.' },
      { title: 'צמיגים ומדינת ייצור', desc: 'מידות הצמיגים המקוריות ומדינת הייצור.' },
      { title: 'ריקול פתוח', desc: 'אם רשומה לכלי קריאת שירות שלא בוצעה, היא תוצג בדו"ח.' },
    ],
    limits: [
      'המאגר הממשלתי של דו-גלגליים אינו כולל תוקף טסט, קילומטראז\' או מספר בעלים קודמים - את אלה יש לבדוק ברישיון הרכב ומול המוכר.',
      'הבדיקה אינה מגלה אם הכלי גנוב או משועבד. שעבוד בודקים ברשם המשכונות, וגניבה - במשטרה.',
    ],
    faqs: [
      { q: 'אפשר לבדוק אופנוע לפי מספר רישוי?', a: 'כן. משרד התחבורה מפרסם מאגר נפרד של כלי רכב דו-גלגליים. מזינים את מספר הרישוי ומקבלים יצרן, דגם, שנת ייצור, נפח מנוע, מספר שלדה, מועד עלייה לכביש וסוג בעלות.' },
      { q: 'האם הבדיקה מתאימה גם לקטנוע ולטרקטורון?', a: 'כן. המאגר כולל אופנועים, קטנועים, תלת-אופנועים, טרקטורונים ורכבים זעירים שרשומים כדו-גלגליים.' },
      { q: 'מה חשוב לבדוק לפני קניית אופנוע יד שנייה?', a: 'שהדגם, השנה ונפח המנוע תואמים למודעה; שמספר השלדה על הכלי זהה לזה שברישיון; מי הבעלים הרשום; ושאין שעבוד. מעבר לכך מומלץ לבדוק את הכלי אצל מכונאי אופנועים לפני התשלום.' },
      { q: 'למה לא מוצג תוקף הטסט של האופנוע?', a: 'מאגר הדו-גלגליים שמפרסם משרד התחבורה אינו כולל את תאריכי הטסט. לרכב פרטי המידע הזה קיים ומוצג בבדיקה.' },
    ],
  },
  'disabled-tag': {
    path: '/disabled-tag-check',
    title: 'בדיקת תו נכה לפי מספר רכב - חינם',
    description: 'בדקו לפי מספר רישוי אם לרכב רשום תג חניה לנכה במאגר משרד התחבורה, ומתי הונפק. בדיקה חינמית ומיידית, ללא הרשמה.',
    h1: 'בדיקת תו נכה לפי מספר רכב',
    kicker: 'תג חניה לנכה',
    intro: 'הזינו מספר רישוי ותדעו אם לרכב רשום תג חניה לנכה במאגר משרד התחבורה - ומתי התג הונפק.',
    facts: [
      { value: '638,000+', label: 'כלי רכב עם תג חניה לנכה במאגר' },
      { value: 'חינם', label: 'ללא הרשמה וללא תשלום' },
      { value: 'רשמי', label: 'נתוני משרד התחבורה' },
    ],
    shows: [
      { title: 'האם רשום תג', desc: 'אם מספר הרישוי מופיע במאגר תגי החניה לנכה, יוצג על כך סימון בדו"ח הרכב.' },
      { title: 'תאריך הנפקה', desc: 'התאריך שבו הונפק התג לרכב.' },
      { title: 'פרטי הרכב', desc: 'יצרן, דגם, שנה וצבע - כדי לוודא שהתג שייך לרכב שלפניכם.' },
    ],
    limits: [
      'המאגר אינו כולל את שם בעל התג או פרטים אישיים כלשהם - רק את מספר הרכב ותאריך ההנפקה.',
      'אם הוצאתם תג לאחרונה והוא עדיין לא מופיע, ייתכן שהמאגר טרם התעדכן. האישור הקובע הוא זה של משרד התחבורה.',
    ],
    faqs: [
      { q: 'איך בודקים אם לרכב יש תו נכה?', a: 'מזינים את מספר הרישוי בשדה שבראש העמוד. אם הרכב רשום במאגר תגי החניה לנכה של משרד התחבורה, יופיע בדו"ח הסימון "תג חניה לנכה רשום" עם תאריך ההנפקה.' },
      { q: 'האם אפשר לבדוק תו נכה לפי תעודת זהות?', a: 'לא כאן. המאגר הפתוח של משרד התחבורה מפורסם לפי מספר רכב בלבד ואינו כולל פרטים מזהים של בעל התג.' },
      { q: 'למי הבדיקה שימושית?', a: 'לבעלי תג שרוצים לוודא שהרכב שלהם רשום כראוי לפני שהם חונים, ולמי שקונה רכב ורוצה לדעת אם רשום עליו תג.' },
      { q: 'החלפתי רכב - התג עובר אוטומטית?', a: 'לא. התג רשום על מספר רכב מסוים, ולכן כשמחליפים רכב יש לעדכן את משרד התחבורה. אחרי העדכון אפשר לחזור לכאן ולוודא שהמספר החדש מופיע.' },
    ],
  },
};

export function plateCheckMetadata(kind: PlateCheckKind): Metadata {
  const c = PLATE_CHECKS[kind];
  const url = `${HE_BASE}${c.path}`;
  return {
    // The root layout's title template appends " | CarIssues"
    title: c.title,
    description: c.description,
    alternates: { canonical: url },
    openGraph: { title: `${c.h1} | CarIssues`, description: c.description, url, images: [{ url: '/og-default.png', width: 1200, height: 630 }] },
  };
}

export default function PlateCheckLanding({ kind }: { kind: PlateCheckKind }) {
  const c = PLATE_CHECKS[kind];
  const url = `${HE_BASE}${c.path}`;
  const others = (Object.keys(PLATE_CHECKS) as PlateCheckKind[]).filter(k => k !== kind);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: `${c.h1} - CarIssues`,
        url,
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
        description: c.description,
      },
      {
        '@type': 'FAQPage',
        mainEntity: c.faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'בית', item: HE_BASE },
          { '@type': 'ListItem', position: 2, name: 'בדיקת רכב', item: `${HE_BASE}/vehicle-lookup` },
          { '@type': 'ListItem', position: 3, name: c.h1, item: url },
        ],
      },
    ],
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '48px 0 40px' }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <nav aria-label="breadcrumb" style={{ fontSize: '0.78rem', marginBottom: 14 }}>
            <Link href="/vehicle-lookup" style={{ color: '#93c5fd', textDecoration: 'none' }}>בדיקת רכב לפי מספר</Link>
            <span style={{ color: '#64748b' }}> / {c.kicker}</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2, marginBottom: 20 }}>{c.h1}</h1>
          <PlateSearch isHe navigateOnSearch />
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.7, marginTop: 20, marginBottom: 0, maxWidth: 560 }}>{c.intro}</p>
          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: 10, marginBottom: 0 }}>החיפוש מריץ את הבדיקה המלאה: טסט, בעלות, נזק, ריקולים, תג נכה ואופנועים - הכל בדו״ח אחד.</p>
          <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 14 }}>מקור: משרד התחבורה (data.gov.il) · היקף המאגר נכון ל{DATA_AS_OF}</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 860, padding: '36px 16px 64px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          {c.facts.map(f => (
            <div key={f.label} className="card" style={{ padding: '18px 20px' }}>
              <dd style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900 }}>{f.value}</dd>
              <dt style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{f.label}</dt>
            </div>
          ))}
        </dl>

        <section className="card" style={{ padding: '24px 28px' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.15rem', margin: '0 0 16px' }}>מה מציגה הבדיקה</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px 28px' }}>
            {c.shows.map(s => (
              <div key={s.title}>
                <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ padding: '24px 28px' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.15rem', margin: '0 0 12px' }}>מה הבדיקה לא מראה</h2>
          <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', lineHeight: 1.65 }}>
            {c.limits.map(l => <li key={l}>{l}</li>)}
          </ul>
        </section>

        <section className="card" style={{ padding: '24px 28px' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.15rem', margin: '0 0 16px' }}>שאלות נפוצות</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {c.faqs.map(f => (
              <div key={f.q}>
                <h3 style={{ margin: '0 0 6px', fontSize: '0.98rem', fontWeight: 700 }}>{f.q}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <nav aria-label="בדיקות נוספות" className="card" style={{ padding: '20px 28px' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1rem', margin: '0 0 12px' }}>בדיקות נוספות לפי מספר רישוי</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px 22px', fontSize: '0.92rem', fontWeight: 600 }}>
            <li><Link href="/vehicle-lookup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>בדיקת רכב מלאה לפי מספר רישוי</Link></li>
            {others.map(k => (
              <li key={k}><Link href={PLATE_CHECKS[k].path} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{PLATE_CHECKS[k].h1}</Link></li>
            ))}
            <li><Link href="/checklist" style={{ color: 'var(--accent)', textDecoration: 'none' }}>צ׳קליסט לקניית רכב יד שנייה</Link></li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
