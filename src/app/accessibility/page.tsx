import type { Metadata } from 'next';
import Link from 'next/link';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';

export const revalidate = 86400;

// Date the statement was last reviewed — update whenever the site is re-checked.
const UPDATED_HE = 'אוקטובר 2026';
const UPDATED_EN = 'October 2026';
const CONTACT_EMAIL = 'contact@carissues.co.il';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const langs = {
    he: 'https://carissues.co.il/accessibility',
    en: 'https://carissues.net/accessibility',
    'x-default': 'https://carissues.net/accessibility',
  };
  return locale === 'en' ? {
    title: 'Accessibility Statement',
    description: 'How CarIssues makes its website accessible, known limitations, and how to report an accessibility problem.',
    alternates: { canonical: `${base}/accessibility`, languages: langs },
  } : {
    title: 'הצהרת נגישות',
    description: 'הצהרת הנגישות של CarIssues IL — התאמות הנגישות באתר, מגבלות ידועות ופרטי פנייה בנושא נגישות.',
    alternates: { canonical: `${base}/accessibility`, languages: langs },
  };
}

const SECTION = { marginBottom: 36 };
const H2 = { fontSize: '1.2rem', fontWeight: 800, marginBottom: 12, color: 'var(--text)' };
const P = { color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 12, fontSize: '0.9375rem' };
const UL = { color: 'var(--text-muted)', lineHeight: 1.8, paddingInlineStart: 20, fontSize: '0.9375rem' };

export default async function AccessibilityPage() {
  const isEn = (await getHostLocale()) === 'en';

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container" style={{ maxWidth: 780 }}>
        <nav aria-label={isEn ? 'Breadcrumb' : 'פירורי לחם'} style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isEn ? 'Home' : 'בית'}</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{isEn ? 'Accessibility Statement' : 'הצהרת נגישות'}</span>
        </nav>

        <h1 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 900, marginBottom: 8, color: 'var(--text)' }}>
          {isEn ? 'Accessibility Statement' : 'הצהרת נגישות'}
        </h1>
        <p style={{ ...P, marginBottom: 36 }}>
          {isEn ? `Last updated: ${UPDATED_EN}` : `עודכן לאחרונה: ${UPDATED_HE}`}
        </p>

        {isEn ? (
          <>
            <section style={SECTION}>
              <h2 style={H2}>Our commitment</h2>
              <p style={P}>
                CarIssues wants every visitor, including people with disabilities, to be able to read reviews, compare cars and
                use our tools independently. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA
                and Israeli Standard SI 5568.
              </p>
            </section>
            <section style={SECTION}>
              <h2 style={H2}>What we have done</h2>
              <ul style={UL}>
                <li>Pages declare their language and reading direction (Hebrew right-to-left, English left-to-right).</li>
                <li>A &ldquo;skip to main content&rdquo; link is available from the keyboard at the top of every page.</li>
                <li>All interactive elements can be reached with the keyboard and show a visible focus outline.</li>
                <li>Form fields, menus and search boxes have accessible names for screen readers.</li>
                <li>Images have text alternatives; decorative images are hidden from assistive technology.</li>
                <li>Pages use consistent headings and landmarks (header, navigation, main content, footer).</li>
                <li>Text can be enlarged with the browser&rsquo;s zoom without loss of content.</li>
              </ul>
            </section>
            <section style={SECTION}>
              <h2 style={H2}>Known limitations</h2>
              <ul style={UL}>
                <li>The interactive 3D car models are provided by a third party (Sketchfab) and may not be fully operable by keyboard or screen reader. The same information about each car is available as text on the page.</li>
                <li>Some user-submitted reviews and photos may lack full descriptions.</li>
              </ul>
            </section>
            <section style={SECTION}>
              <h2 style={H2}>Report an accessibility problem</h2>
              <p style={P}>
                If something on the site is hard to use, please tell us and we will fix it or provide the information another way.
                Email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--primary, #2563eb)' }}>{CONTACT_EMAIL}</a> or
                use the <Link href="/contact" style={{ color: 'var(--primary, #2563eb)' }}>contact form</Link>. Please include the page address and a short description of the problem.
              </p>
            </section>
          </>
        ) : (
          <>
            <section style={SECTION}>
              <h2 style={H2}>המחויבות שלנו</h2>
              <p style={P}>
                ב-CarIssues אנחנו רוצים שכל גולש, כולל אנשים עם מוגבלות, יוכל לקרוא ביקורות, להשוות רכבים ולהשתמש בכלים באתר
                באופן עצמאי. האתר שואף לעמוד בהנחיות WCAG 2.1 ברמה AA ובתקן הישראלי ת&quot;י 5568, בהתאם לתקנות שוויון זכויות
                לאנשים עם מוגבלות (התאמות נגישות לשירות).
              </p>
            </section>
            <section style={SECTION}>
              <h2 style={H2}>התאמות שבוצעו באתר</h2>
              <ul style={UL}>
                <li>הגדרת שפה וכיוון קריאה בכל עמוד (עברית מימין לשמאל, אנגלית משמאל לימין).</li>
                <li>קישור &quot;דלגו לתוכן הראשי&quot; בראש כל עמוד, הנגיש מהמקלדת.</li>
                <li>ניתן להגיע לכל רכיב אינטראקטיבי באמצעות המקלדת, עם סימון פוקוס נראה לעין.</li>
                <li>לשדות טפסים, תפריטים ותיבות חיפוש יש תוויות לקוראי מסך.</li>
                <li>לתמונות יש טקסט חלופי; תמונות דקורטיביות מוסתרות מטכנולוגיות מסייעות.</li>
                <li>מבנה כותרות ואזורי עמוד עקבי (כותרת, ניווט, תוכן ראשי, כותרת תחתונה).</li>
                <li>ניתן להגדיל את הטקסט באמצעות הזום של הדפדפן ללא אובדן תוכן.</li>
              </ul>
            </section>
            <section style={SECTION}>
              <h2 style={H2}>מגבלות ידועות</h2>
              <ul style={UL}>
                <li>מודלי התלת-ממד האינטראקטיביים מסופקים על ידי צד שלישי (Sketchfab) וייתכן שאינם נגישים במלואם למקלדת או לקורא מסך. המידע על כל רכב זמין גם כטקסט בעמוד.</li>
                <li>ייתכן שחלק מהביקורות והתמונות שמעלים משתמשים אינן כוללות תיאור מלא.</li>
              </ul>
            </section>
            <section style={SECTION}>
              <h2 style={H2}>פנייה בנושא נגישות</h2>
              <p style={P}>
                נתקלתם בקושי באתר? ספרו לנו ונתקן אותו או נמסור לכם את המידע בדרך אחרת. ניתן לפנות בדוא&quot;ל
                ל-<a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--primary, #2563eb)' }}>{CONTACT_EMAIL}</a> או
                דרך <Link href="/contact" style={{ color: 'var(--primary, #2563eb)' }}>טופס יצירת הקשר</Link>. נא לציין את כתובת העמוד ותיאור קצר של הבעיה.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
