import type { Metadata } from 'next';
import Link from 'next/link';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const langs = { he: 'https://carissues.co.il/terms', en: 'https://carissues.net/terms', 'x-default': 'https://carissues.net/terms' };
  return locale === 'en' ? {
    title: 'Terms of Use',
    description: 'Terms of use for the CarIssues website.',
    alternates: { canonical: `${base}/terms`, languages: langs },
  } : {
    title: 'תנאי שימוש',
    description: 'תנאי השימוש באתר CarIssues IL',
    alternates: { canonical: `${base}/terms`, languages: langs },
  };
}

export default async function TermsPage() {
  const locale = await getHostLocale();
  const isEn = locale === 'en';

  if (isEn) {
    return (
      <div style={{ padding: '48px 0 80px' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
            <span>›</span>
            <span>Terms of Use</span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>Terms of Use</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 40 }}>Last updated: March 2026</p>

          <div className="card" style={{ padding: '32px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
            <Section title="1. General">
              <p>Welcome to CarIssues ("the Site"). By using the Site you agree to the terms below. If you do not agree, please discontinue use of the Site.</p>
            </Section>

            <Section title="2. Site Content">
              <p>The Site aggregates information, reviews, and user-submitted reports about vehicles. All content is provided for general informational purposes only and does not constitute professional, engineering, medical, or legal advice.</p>
              <p style={{ marginTop: 12 }}>Some content is generated with the assistance of AI tools and is marked accordingly. Such content may contain inaccuracies and should not be relied upon as an authoritative source.</p>
            </Section>

            <Section title="3. User Reviews">
              <p>Users may post reviews and opinions. By submitting content, the user represents that:</p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>The content is based on their genuine personal experience</li>
                <li>It does not infringe third-party rights</li>
                <li>It does not include offensive, false, or misleading material</li>
              </ul>
              <p style={{ marginTop: 12 }}>The Site may remove content at its sole discretion.</p>
            </Section>

            <Section title="4. Limitation of Liability">
              <p>The Site is provided "as is". We are not liable for direct, indirect, incidental, special, or consequential damages arising from reliance on information on the Site.</p>
              <p style={{ marginTop: 12 }}>Before making any vehicle-related decision — repair, purchase, or sale — consult qualified professionals. Vehicle details, prices, and technical issues change; information on the Site may not reflect current conditions.</p>
            </Section>

            <Section title="5. Intellectual Property">
              <p>All content created by the Site team — text, design, code — is owned by the Site. User reviews remain the property of their authors; by posting, the user grants the Site a non-exclusive license to display them.</p>
            </Section>

            <Section title="6. Privacy">
              <p>The Site collects minimal information necessary for its operation (email address for registration, user activity). We do not sell personal information to third parties.</p>
            </Section>

            <Section title="7. Changes to Terms">
              <p>We may update these terms at any time. Material changes will be published on this page. Continued use of the Site after changes are published constitutes acceptance of those changes.</p>
            </Section>

            <Section title="8. Governing Law">
              <p>These terms are governed by Israeli law. Exclusive jurisdiction for any dispute shall be the courts of Israel.</p>
            </Section>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link href="/contact" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              Questions? Contact Us →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <span>תנאי שימוש</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>תנאי שימוש</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 40 }}>עדכון אחרון: מרץ 2026</p>

        <div className="card" style={{ padding: '32px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
          <Section title="1. כללי">
            <p>ברוכים הבאים ל-CarIssues IL ("האתר"). השימוש באתר מהווה הסכמה לתנאים המפורטים להלן. אם אינך מסכים לתנאים אלה, אנא הפסק את השימוש באתר.</p>
          </Section>

          <Section title="2. תוכן האתר">
            <p>האתר מרכז מידע, ביקורות ודיווחים של משתמשים על כלי רכב. המידע מוצג למטרות מידע כללי בלבד ואינו מהווה ייעוץ מקצועי, הנדסי, רפואי או משפטי.</p>
            <p style={{ marginTop: 12 }}>חלק מהתוכן נוצר בסיוע כלי בינה מלאכותית ומסומן בהתאם. תוכן זה עשוי להכיל אי-דיוקים ואין להסתמך עליו כמקור סמכותי.</p>
          </Section>

          <Section title="3. ביקורות משתמשים">
            <p>משתמשים רשאים לפרסם ביקורות וחוות דעת. על ידי פרסום תוכן, המשתמש מצהיר כי:</p>
            <ul style={{ paddingRight: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>התוכן הוא מניסיונו האישי האמיתי</li>
              <li>אינו מפר זכויות צד שלישי</li>
              <li>אינו כולל תוכן פוגעני, שקרי, או מסיטי</li>
            </ul>
            <p style={{ marginTop: 12 }}>האתר רשאי להסיר תוכן לפי שיקול דעתו.</p>
          </Section>

          <Section title="4. הגבלת אחריות">
            <p>האתר מסופק "כפי שהוא" (AS IS). אנו אינו אחראים לנזקים ישירים, עקיפים, מקריים, מיוחדים או תוצאתיים הנובעים מהסתמכות על המידע באתר.</p>
            <p style={{ marginTop: 12 }}>לפני כל החלטה הנוגעת לרכב — תיקון, קנייה, מכירה — יש להתייעץ עם אנשי מקצוע מוסמכים. פרטי רכב, מחירים ובעיות טכניות משתנים; המידע באתר עשוי שלא לשקף את המצב העדכני.</p>
          </Section>

          <Section title="5. קניין רוחני">
            <p>כל התוכן שנוצר על ידי צוות האתר — טקסטים, עיצוב, קוד — שמור לאתר. ביקורות משתמשים נותרות בבעלות כותביהן; המשתמש מעניק לאתר רישיון לא-בלעדי להציגן.</p>
          </Section>

          <Section title="6. פרטיות">
            <p>האתר אוסף מידע מינימלי הדרוש לתפעולו (כתובת דואר אלקטרוני להרשמה, פעילות משתמש). אין אנו מוכרים מידע אישי לצדדים שלישיים.</p>
          </Section>

          <Section title="7. שינויים בתנאים">
            <p>אנו רשאים לעדכן תנאים אלה בכל עת. שינויים מהותיים יפורסמו בדף זה. המשך השימוש באתר לאחר פרסום שינויים מהווה הסכמה להם.</p>
          </Section>

          <Section title="8. דין חל">
            <p>תנאים אלה כפופים לדין הישראלי. סמכות השיפוט הבלעדית לכל סכסוך תהיה לבתי המשפט בישראל.</p>
          </Section>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/contact" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            שאלות? צור קשר ←
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}
