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

        <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <span>מדיניות פרטיות</span>
        </div>

        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: 12 }}>
            מדיניות פרטיות
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            עדכון אחרון: מרץ 2026
          </p>
        </div>

        <div className="card" style={{ padding: '36px 40px' }}>

          <p style={{ ...P_STYLE, marginBottom: 32 }}>
            ברוכים הבאים ל-CarIssues IL ("האתר", "השירות"). מדיניות פרטיות זו מסבירה כיצד אנו אוספים,
            משתמשים ומגנים על המידע שלך. השימוש באתר מהווה הסכמה מלאה למדיניות זו.
            אם אינך מסכים לאי אלו מהתנאים — אנא הפסק את השימוש באתר לאלתר.
          </p>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>1. המידע שאנו אוספים</h2>
            <p style={P_STYLE}>אנו עשויים לאסוף את סוגי המידע הבאים:</p>
            <ul style={UL_STYLE}>
              <li><strong>פרטי חשבון:</strong> כתובת דואר אלקטרוני ושם תצוגה בעת הרשמה.</li>
              <li><strong>תוכן שיצרת:</strong> ביקורות, דירוגים וחוות דעת שפרסמת באתר.</li>
              <li><strong>נתוני שימוש:</strong> עמודים שביקרת, מזהי סשן אנונימיים ותאריכי ביקורים — לצורך ניתוח סטטיסטי בלבד.</li>
              <li><strong>מידע טכני:</strong> סוג הדפדפן, סוג המכשיר וכתובת IP — נאספים באופן אוטומטי.</li>
            </ul>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>2. כיצד אנו משתמשים במידע</h2>
            <ul style={UL_STYLE}>
              <li>להפעלת שירות הביקורות ואפשרות פרסום חוות דעת.</li>
              <li>לזיהוי ואימות משתמשים רשומים.</li>
              <li>לשיפור חוויית המשתמש ותוכן האתר.</li>
              <li>לניתוח סטטיסטי של פעילות האתר (ללא זיהוי אישי).</li>
              <li>לאיתור, מניעה וחסימת שימוש לרעה, ספאם ותכנים פוגעניים.</li>
            </ul>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>3. שירותי צד שלישי</h2>
            <p style={P_STYLE}>
              לצורך הפעלת האתר אנו עושים שימוש בספקי שירות חיצוניים מאובטחים, הכוללים בין היתר:
              שירותי אחסון ענן, שירות אימות זהות, שירות כניסה חברתית (OAuth), ושירותי בינה מלאכותית
              לעיבוד תוכן ציבורי. ספקים אלה כפופים למדיניות הפרטיות שלהם ואינם מקבלים מידע אישי
              מזהה של משתמשים מעבר למה שנדרש לפעולתם.
            </p>
            <p style={P_STYLE}>
              אנו מתחייבים לעבוד אך ורק עם ספקים העומדים בתקני אבטחה ופרטיות מקובלים בתעשייה.
            </p>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>4. שיתוף מידע עם גורמים חיצוניים</h2>
            <p style={P_STYLE}>
              אנו לא מוכרים, סוחרים או מעבירים מידע אישי לצדדים שלישיים למטרות שיווק.
              מידע עשוי להיות מועבר רק לספקי השירות הדרושים להפעלת האתר, ובמידה הנדרשת לכך בלבד.
              ביקורות שפרסמת הן ציבוריות וגלויות לכל.
            </p>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>5. קובצי Cookie</h2>
            <p style={P_STYLE}>
              האתר משתמש ב-cookies חיוניים בלבד לצורך שמירת סשן הכניסה ולניתוח גישה.
              אנו לא משתמשים ב-cookies לצרכי פרסום ממוקד או מעקב בין-אתרי.
            </p>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>6. אבטחת מידע</h2>
            <p style={P_STYLE}>
              אנו נוקטים באמצעי אבטחה מתקדמים להגנה על המידע שלך, כולל הצפנת תעבורה (HTTPS),
              אימות מאובטח, הרשאות גישה מוגבלות ומעקב אחר פעילות חשודה. עם זאת, אין מערכת
              מאובטחת לחלוטין ואנו לא יכולים להבטיח אבטחה מוחלטת.
            </p>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>7. הגנה מפני שימוש לרעה</h2>
            <p style={P_STYLE}>
              האתר מיישם מנגנוני הגנה פעילים מפני ספאם, תוכן פוגעני ושימוש זדוני.
              פרסום תכנים הכוללים שפה פוגענית, הטרדה, הונאה או ספאם עלול להוביל לחסימת החשבון
              ומחיקת התוכן ללא התראה מוקדמת.
            </p>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>8. הזכויות שלך</h2>
            <p style={P_STYLE}>יש לך את הזכויות הבאות בנוגע למידע האישי שלך:</p>
            <ul style={UL_STYLE}>
              <li><strong>עיון:</strong> לבקש לראות את המידע שיש לנו עליך.</li>
              <li><strong>תיקון:</strong> לבקש תיקון מידע שגוי.</li>
              <li><strong>מחיקה:</strong> לבקש מחיקת החשבון וכלל הנתונים האישיים שלך.</li>
              <li><strong>ניוד:</strong> לבקש עותק של הנתונים שלך בפורמט קריא.</li>
            </ul>
            <p style={{ ...P_STYLE, marginTop: 12 }}>
              לממש את זכויותיך, אנא פנה אלינו דרך <Link href="/contact" style={{ color: 'var(--brand-red)' }}>עמוד יצירת קשר</Link>.
            </p>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>9. שמירת מידע</h2>
            <p style={P_STYLE}>
              אנו שומרים מידע אישי כל עוד החשבון פעיל, או כנדרש לצורך ניהול סכסוכים משפטיים,
              אכיפת הסכמים ועמידה בדרישות חוקיות. עם מחיקת חשבון, מידע אישי מזהה יוסר תוך 30 יום.
            </p>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>10. שינויים במדיניות</h2>
            <p style={P_STYLE}>
              אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר.
              המשך השימוש באתר לאחר עדכון המדיניות מהווה הסכמה לשינויים.
            </p>
          </div>

          <div style={{ ...SECTION_STYLE, marginBottom: 0 }}>
            <h2 style={H2_STYLE}>11. יצירת קשר</h2>
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
