import type { Metadata } from 'next';
import Link from 'next/link';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const langs = { he: 'https://carissues.co.il/privacy', en: 'https://carissues.net/privacy', 'x-default': 'https://carissues.net/privacy' };
  return locale === 'en' ? {
    title: 'Privacy Policy',
    description: 'Privacy policy for CarIssues — how we collect, use, and protect your information.',
    alternates: { canonical: `${base}/privacy`, languages: langs },
  } : {
    title: 'מדיניות פרטיות',
    description: 'מדיניות הפרטיות של CarIssues IL — כיצד אנו אוספים, משתמשים ומגנים על המידע שלך.',
    alternates: { canonical: `${base}/privacy`, languages: langs },
  };
}

const SECTION_STYLE = { marginBottom: 40 };
const H2_STYLE = { fontSize: '1.2rem', fontWeight: 800, marginBottom: 12, color: 'var(--text)' };
const P_STYLE = { color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 12, fontSize: '0.9375rem' };
const UL_STYLE = { color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 20, fontSize: '0.9375rem' };
const UL_STYLE_HE = { color: 'var(--text-muted)', lineHeight: 1.8, paddingRight: 20, fontSize: '0.9375rem' };

export default async function PrivacyPage() {
  const locale = await getHostLocale();
  const isEn = locale === 'en';

  if (isEn) {
    return (
      <div style={{ padding: '48px 0 80px' }}>
        <div className="container" style={{ maxWidth: 780 }}>
          <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 32 }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
            <span>›</span>
            <span>Privacy Policy</span>
          </div>

          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: 12 }}>Privacy Policy</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Last updated: March 2026</p>
          </div>

          <div className="card" style={{ padding: '36px 40px' }}>
            <p style={{ ...P_STYLE, marginBottom: 32 }}>
              Welcome to CarIssues ("the Site", "the Service"). This Privacy Policy explains how we collect, use, and protect your information. By using the Site you agree to this policy. If you disagree with any part of these terms, please stop using the Site.
            </p>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>1. Information We Collect</h2>
              <p style={P_STYLE}>We may collect the following types of information:</p>
              <ul style={UL_STYLE}>
                <li><strong>Account details:</strong> email address and display name upon registration.</li>
                <li><strong>Content you create:</strong> reviews, ratings, and opinions you publish on the Site.</li>
                <li><strong>Usage data:</strong> pages visited, anonymous session IDs, and visit dates — for statistical analysis only.</li>
                <li><strong>Technical info:</strong> browser type, device type, and IP address — collected automatically.</li>
              </ul>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>2. How We Use Your Information</h2>
              <ul style={UL_STYLE}>
                <li>To operate the review service and allow publishing of opinions.</li>
                <li>To identify and authenticate registered users.</li>
                <li>To improve user experience and site content.</li>
                <li>For statistical analysis of site activity (non-identifying).</li>
                <li>To detect, prevent, and block abuse, spam, and harmful content.</li>
              </ul>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>3. Third-Party Services</h2>
              <p style={P_STYLE}>
                To operate the Site we use secure third-party service providers, including cloud storage, identity verification, social login (OAuth), and AI services for processing public content. These providers are subject to their own privacy policies and do not receive personally identifying information beyond what is required for their operation.
              </p>
              <p style={P_STYLE}>We are committed to working only with providers who meet industry-standard security and privacy requirements.</p>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>4. Sharing Your Information</h2>
              <p style={P_STYLE}>
                We do not sell, trade, or transfer personal information to third parties for marketing purposes. Information may be shared only with service providers necessary to operate the Site, and only to the extent required. Reviews you post are public and visible to all.
              </p>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>5. Cookies</h2>
              <p style={P_STYLE}>
                The Site uses only essential cookies for session management and access analytics. We do not use cookies for targeted advertising or cross-site tracking.
              </p>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>6. Data Security</h2>
              <p style={P_STYLE}>
                We implement advanced security measures to protect your information, including HTTPS encryption, secure authentication, limited access permissions, and monitoring of suspicious activity. However, no system is fully secure and we cannot guarantee absolute security.
              </p>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>7. Protection Against Misuse</h2>
              <p style={P_STYLE}>
                The Site implements active protections against spam, harmful content, and malicious use. Posting content that includes offensive language, harassment, fraud, or spam may result in account suspension and content removal without prior notice.
              </p>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>8. Your Rights</h2>
              <p style={P_STYLE}>You have the following rights regarding your personal information:</p>
              <ul style={UL_STYLE}>
                <li><strong>Access:</strong> request to see the information we hold about you.</li>
                <li><strong>Correction:</strong> request correction of inaccurate information.</li>
                <li><strong>Deletion:</strong> request deletion of your account and all personal data.</li>
                <li><strong>Portability:</strong> request a copy of your data in a readable format.</li>
              </ul>
              <p style={{ ...P_STYLE, marginTop: 12 }}>
                To exercise your rights, please contact us via the <Link href="/contact" style={{ color: 'var(--accent)' }}>Contact page</Link>.
              </p>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>9. Data Retention</h2>
              <p style={P_STYLE}>
                We retain personal information as long as the account is active, or as required for managing legal disputes, enforcing agreements, and complying with legal requirements. Upon account deletion, personally identifying information will be removed within 30 days.
              </p>
            </div>

            <div style={SECTION_STYLE}>
              <h2 style={H2_STYLE}>10. Policy Changes</h2>
              <p style={P_STYLE}>
                We may update this policy from time to time. Material changes will be announced on the Site. Continued use of the Site after an update constitutes acceptance of the changes.
              </p>
            </div>

            <div style={{ ...SECTION_STYLE, marginBottom: 0 }}>
              <h2 style={H2_STYLE}>11. Contact</h2>
              <p style={P_STYLE}>
                For questions or requests about privacy, please reach us via the{' '}
                <Link href="/contact" style={{ color: 'var(--accent)' }}>Contact page</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container" style={{ maxWidth: 780 }}>
        <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <span>מדיניות פרטיות</span>
        </div>

        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: 12 }}>מדיניות פרטיות</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>עדכון אחרון: מרץ 2026</p>
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
            <ul style={UL_STYLE_HE}>
              <li><strong>פרטי חשבון:</strong> כתובת דואר אלקטרוני ושם תצוגה בעת הרשמה.</li>
              <li><strong>תוכן שיצרת:</strong> ביקורות, דירוגים וחוות דעת שפרסמת באתר.</li>
              <li><strong>נתוני שימוש:</strong> עמודים שביקרת, מזהי סשן אנונימיים ותאריכי ביקורים — לצורך ניתוח סטטיסטי בלבד.</li>
              <li><strong>מידע טכני:</strong> סוג הדפדפן, סוג המכשיר וכתובת IP — נאספים באופן אוטומטי.</li>
            </ul>
          </div>

          <div style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>2. כיצד אנו משתמשים במידע</h2>
            <ul style={UL_STYLE_HE}>
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
            <ul style={UL_STYLE_HE}>
              <li><strong>עיון:</strong> לבקש לראות את המידע שיש לנו עליך.</li>
              <li><strong>תיקון:</strong> לבקש תיקון מידע שגוי.</li>
              <li><strong>מחיקה:</strong> לבקש מחיקת החשבון וכלל הנתונים האישיים שלך.</li>
              <li><strong>ניוד:</strong> לבקש עותק של הנתונים שלך בפורמט קריא.</li>
            </ul>
            <p style={{ ...P_STYLE, marginTop: 12 }}>
              לממש את זכויותיך, אנא פנה אלינו דרך <Link href="/contact" style={{ color: 'var(--accent)' }}>עמוד יצירת קשר</Link>.
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
              <Link href="/contact" style={{ color: 'var(--accent)' }}>עמוד יצירת קשר</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
