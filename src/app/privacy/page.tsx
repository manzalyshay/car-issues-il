import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות',
  description: 'מדיניות הפרטיות של CarIssues IL — כיצד אנו אוספים, משתמשים ומגנים על המידע שלך.',
};

const SECTION_STYLE = { marginBottom: 40 };
const H2_STYLE = { fontSize: '1.2rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' };
const P_STYLE = { color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 12, fontSize: '0.9375rem' };
const UL_STYLE = { color: 'var(--text-secondary)', lineHeight: 1.8, paddingRight: 20, fontSize: '0.9375rem' };

export default function PrivacyPage() {
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container" style={{ maxWidth: 780 }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <span>מדיניות פרטיות</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: 12 }}>
            מדיניות פרטיות
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            עדכון אחרון: מרץ 2025
          </p>
        </div>

        <div className="card" style={{ padding: '36px 40px' }}>

          <p style={{ ...P_STYLE, marginBottom: 32 }}>
            ברוכים הבאים ל-CarIssues IL. מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים
            על המידע האישי שלך בעת השימוש באתר שלנו. השימוש באתר מהווה הסכמה למדיניות זו.
          </p>

          {/* Section 1 */}
          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>1. המידע שאנו אוספים</h2>
            <p style={P_STYLE}>אנו עשויים לאסוף את סוגי המידע הבאים:</p>
            <ul style={UL_STYLE}>
              <li><strong>פרטי חשבון:</strong> כתובת דואר אלקטרוני ושם תצוגה בעת הרשמה (ישירות או דרך Google).</li>
              <li><strong>תוכן שיצרת:</strong> ביקורות, דירוגים והגבות שפרסמת באתר.</li>
              <li><strong>נתוני שימוש:</strong> עמודים שביקרת, מזהי סשן אנונימיים ותאריכי ביקורים — לצורך ניתוח סטטיסטי בלבד.</li>
              <li><strong>מידע טכני:</strong> סוג הדפדפן וסוג המכשיר — נאספים באופן אוטומטי.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>2. כיצד אנו משתמשים במידע</h2>
            <ul style={UL_STYLE}>
              <li>להפעלת שירות הביקורות ואפשרות פרסום חוות דעת.</li>
              <li>לזיהוי ואימות משתמשים רשומים.</li>
              <li>לשיפור חוויית המשתמש ותוכן האתר.</li>
              <li>לניתוח סטטיסטי של פעילות האתר (ללא זיהוי אישי).</li>
              <li>לאיתור ומניעת שימוש לרעה.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>3. שירותי צד שלישי</h2>
            <p style={P_STYLE}>אנו משתמשים בשירותים חיצוניים הבאים לצורך הפעלת האתר:</p>
            <ul style={UL_STYLE}>
              <li>
                <strong>Supabase</strong> — לאחסון מסדי נתונים ואימות משתמשים.
                מידע נוסף: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-red)' }}>supabase.com/privacy</a>
              </li>
              <li>
                <strong>Google OAuth</strong> — לאפשרות כניסה עם חשבון Google.
                מידע נוסף: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-red)' }}>policies.google.com/privacy</a>
              </li>
              <li>
                <strong>Google Gemini / Mistral AI</strong> — ליצירת סיכומי ביקורות אוטומטיים מתוכן ציבורי.
                לא מועבר מידע אישי של משתמשים לשירותים אלה.
              </li>
              <li>
                <strong>Vercel</strong> — לאחסון ושרתי האתר.
                מידע נוסף: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-red)' }}>vercel.com/legal/privacy-policy</a>
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>4. שיתוף מידע עם גורמים חיצוניים</h2>
            <p style={P_STYLE}>
              אנו לא מוכרים, סוחרים או מעבירים את המידע האישי שלך לצדדים שלישיים,
              למעט ספקי השירות המפורטים לעיל הדרושים להפעלת האתר.
              ביקורות שפרסמת הן ציבוריות וגלויות לכל.
            </p>
          </div>

          {/* Section 5 */}
          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>5. קובצי Cookie</h2>
            <p style={P_STYLE}>
              האתר משתמש ב-cookies חיוניים בלבד לצורך שמירת סשן הכניסה. אנו לא משתמשים
              ב-cookies לצורכי פרסום או מעקב.
            </p>
          </div>

          {/* Section 6 */}
          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>6. אבטחת מידע</h2>
            <p style={P_STYLE}>
              אנו נוקטים באמצעי אבטחה סבירים להגנה על המידע שלך, כולל הצפנת תעבורה (HTTPS),
              אימות מאובטח וגישה מוגבלת למסדי הנתונים. עם זאת, אין מערכת מאובטחת לחלוטין.
            </p>
          </div>

          {/* Section 7 */}
          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>7. הזכויות שלך</h2>
            <p style={P_STYLE}>יש לך את הזכויות הבאות בנוגע למידע האישי שלך:</p>
            <ul style={UL_STYLE}>
              <li><strong>עיון:</strong> לבקש לראות את המידע שיש לנו עליך.</li>
              <li><strong>תיקון:</strong> לבקש תיקון מידע שגוי.</li>
              <li><strong>מחיקה:</strong> לבקש מחיקת החשבון ושל הנתונים האישיים שלך.</li>
              <li><strong>ניוד:</strong> לבקש עותק של הנתונים שלך בפורמט קריא.</li>
            </ul>
            <p style={{ ...P_STYLE, marginTop: 12 }}>
              לממש את זכויותיך, אנא פנה אלינו דרך <Link href="/contact" style={{ color: 'var(--brand-red)' }}>עמוד יצירת קשר</Link>.
            </p>
          </div>

          {/* Section 8 */}
          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>8. שינויים במדיניות</h2>
            <p style={P_STYLE}>
              אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר.
              המשך השימוש באתר לאחר עדכון המדיניות מהווה הסכמה לשינויים.
            </p>
          </div>

          {/* Section 9 */}
          <div style={{ ...SECTION_STYLE, marginBottom: 0 }}>
            <h2 style={H2_STYLE}>9. יצירת קשר</h2>
            <p style={P_STYLE}>
              לשאלות או בקשות בנושא פרטיות, ניתן לפנות אלינו דרך{' '}
              <Link href="/contact" style={{ color: 'var(--brand-red)' }}>עמוד יצירת קשר</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
