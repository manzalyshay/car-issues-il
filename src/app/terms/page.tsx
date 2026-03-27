import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'תנאי שימוש — CarIssues IL',
  description: 'תנאי השימוש באתר CarIssues IL',
};

export default function TermsPage() {
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

        <div className="card" style={{ padding: '32px', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
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
          <Link href="/contact" style={{ color: 'var(--brand-red)', fontWeight: 600, textDecoration: 'none' }}>
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
      <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}
