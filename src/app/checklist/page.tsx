import type { Metadata } from 'next';
import { getHostLocale } from '@/lib/hostLocale';

export const revalidate = 3600; // cache 1 hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const isEn = locale === 'en';
  return {
    title: isEn ? 'Used Car Buying Checklist — 40 Critical Checks | CarIssues' : 'רשימת בדיקה לקניית יד שניה — 40 נקודות קריטיות | CarIssues',
    description: isEn
      ? '40 critical checks before buying a used car. Inspect the exterior, interior, engine, documents, and test drive — don\'t sign without this checklist.'
      : '40 נקודות בדיקה לפני קניית רכב יד שניה. בדיקת חוץ, פנים, מנוע, מסמכים ונסיעת מבחן — אל תגיעו לרכב בלי זה.',
  };
}

const GROUPS_HE = [
  {
    title: 'מבחוץ — הליכה מסביב לרכב',
    icon: '🚶',
    items: [
      'תסתכל אם יש שריטות, שקעים או נזקים ברחבי הרכב',
      'בדוק שצבע הרכב אחיד מכל צד — צבע שונה מצביע על תיקון תאונה',
      'פתח וסגור כל דלת — צריך ללכת בקלות ולנעול בלי כוח',
      'בדוק את הצמיגים — שאין בלאי חד-צדדי ושהגומי לא חרוש יותר מדי',
      'הסתכל מתחת לרכב — שאין כתמי שמן או נוזלים על הקרקע',
      'בדוק את השמשה הקדמית — אפילו סדק קטן בשדה הראייה פוסל',
      'בדוק שכל האורות עובדים — קדמיים, אחוריים ועצירה',
    ],
  },
  {
    title: 'מבפנים — ישיבה ובדיקה',
    icon: '🪑',
    items: [
      'הדלק את הרכב ובדוק שלא נשארת נורה דולקת בלוח המחוונים',
      'הפעל את המזגן — צריך לקרר תוך דקה, בלי ריח עובש',
      'בדוק שמערכת השמע, Bluetooth, מצלמת גיבוי וחניה אוטומטית עובדים',
      'משוך כל חגורת בטיחות — צריכה לחזור לאחור ולהינעל בקליק',
      'בדוק את הכיסאות — קרעים, כפתורים שבורים, ריח רטיבות',
      'הסתכל על התקרה ורצפת הרכב — כתמי מים = בעיית איטום',
      'אם יש גג שמש — פתח וסגור אותו, בדוק שלא מטפטף',
    ],
  },
  {
    title: 'מנוע — בדיקה בסיסית לכל אחד',
    icon: '🔧',
    items: [
      'פתח את מכסה המנוע לאחר נסיעה ובדוק שאין ריח שרוף',
      'הסתכל על מד השמן — צריך להיות בין ה-MIN ל-MAX (לא שחור סמיך)',
      'בדוק שאין נוזלים שנוטפים או מתייבשים מתחת למנוע',
      'הכנס את האצבע לצינור נוזל הקירור (כשהמנוע קר!) — הצבע צריך להיות ירוק/כתום, לא חלודה',
      'הקשב למנוע בסרלנטי — בלי קישקושים, רעשים חריגים או רעד חזק',
      'אם המנוע "נוקש" או "שורק" — זה סימן אדום',
    ],
  },
  {
    title: 'נסיעת מבחן',
    icon: '🛣️',
    items: [
      'תנסע לפחות 20 דקות — חצי בעיר, חצי בכביש מהיר',
      'בדוק שהרכב לא מושך לצד בנסיעה ישרה',
      'בלום בחדות — הרכב לא צריך לסטות לצד',
      'האזן לקישקושים או רעשים בזמן פניות',
      'בדוק שהגיר עולה ויורד בצורה חלקה, בלי "לחיצות"',
      'בדוק שמד הטמפרטורה לא עולה לאזור האדום',
      'בסוף הנסיעה — בדוק שאין עשן יוצא מהפליט',
    ],
  },
  {
    title: 'מסמכים — מה לבקש מהמוכר',
    icon: '📋',
    items: [
      'בקש את ספר השירות — תבדוק שיש חותמות קבועות ממוסך',
      'ודא שהשם ברישיון הרכב זהה לשם המוכר שלפניך',
      'בדוק שהרישיון בתוקף ושהטסט הבא לא בקרוב מדי',
      'הכנס את מספר הרכב לאתר "בדיקת רכב" של משרד התחבורה',
      'בקש לבדוק אם יש עיקול על הרכב (דרך כונס הנכסים או עורך דין)',
      'אל תשלם מקדמה לפני שסגרת הסכם בכתב עם פרטי הרכב המלאים',
      'קבל קבלה / חשבונית על כל תשלום — גם קדמה',
    ],
  },
  {
    title: 'מומלץ — לפני שמגיעים',
    icon: '💡',
    items: [
      'חפש את הדגם כאן באתר — קרא ביקורות בעלים ובעיות נפוצות',
      'גוגל את הדגם + שנה + "בעיות" כדי לדעת מה לצפות',
      'תנסה להגיע לרכב כשהוא קר — מנוע חמם מסתיר רעשים',
      'קח מישהו נוסף אתך — עיניים נוספות שמות לב לדברים שונים',
      'אם משהו נראה מוזר — אל תמהר, תשאל ותבדוק',
      'לפני סגירה — שלח לבדיקה במוסך מורשה (200–400 ₪ שיכולים לחסוך אלפים)',
    ],
  },
];

const GROUPS_EN = [
  {
    title: 'Exterior Inspection',
    icon: '🚗',
    items: [
      'Check all windows for cracks, chips, or deep scratches',
      'Inspect bumpers for dents, cracks, or uneven paint',
      'Check all doors: smooth opening/closing, hinges OK',
      'Look for rust on fenders, roof, and undercarriage',
      'Check panel alignment — uneven gaps suggest past body work',
      'Inspect paint from all angles for inconsistency (partial respray)',
      'Check tires: even wear, tread depth at least 1.6 mm',
      'Check windshield — no cracks in the driver\'s sightline',
    ],
  },
  {
    title: 'Under the Hood',
    icon: '🔧',
    items: [
      'Check oil level and color — amber/brown, not black sludge',
      'Check coolant level — not murky or rusty',
      'Check brake fluid, power steering, and washer fluid',
      'Look for leaks: oil, coolant, or fluid under the car',
      'Inspect belts and hoses — no cracks or unusual wear',
      'Check battery terminals — clean, no corrosion',
      'Smell for burning odors (oil, rubber, electrical)',
      'Check if engine bay is suspiciously clean (pre-sale spray)',
    ],
  },
  {
    title: 'Interior Check',
    icon: '🪑',
    items: [
      'Check seats for tears, excessive wear, and height adjustment',
      'Check dashboard — no warning lights (especially engine light)',
      'Test A/C — adequate cooling, no unusual smell',
      'Test seatbelts — smooth retraction and firm latch',
      'Check sunroof/panoramic roof — no water stains, smooth operation',
      'Check for OBD errors if possible (trip reset shows zero)',
      'Listen for unusual noises while driving (rattles, knocks)',
      'Inspect headliner and carpet for moisture/mold stains',
    ],
  },
  {
    title: 'Brakes, Wheels & Steering',
    icon: '⚙️',
    items: [
      'Check brake pads and rotors — adequate thickness, no cracks',
      'Test hard braking — no pulling to one side',
      'Check CV joints — clicking noise on turns under acceleration',
      'Check shocks/struts — push down car, should not bounce more than once',
      'Check steering — no free play, smooth full lock both ways',
      'Check spare tire — proper pressure, no visible wear',
    ],
  },
  {
    title: 'Documents & History',
    icon: '📋',
    items: [
      'Check service book has consistent stamps from authorized dealers',
      'Verify VIN matches on license, door jamb, and engine',
      'Run a history report (Carfax or local equivalent)',
      'Check for any outstanding liens, loans, or penalties',
      'Verify registration is valid and next inspection is upcoming',
      'Confirm seller is the registered owner on title',
      'Get a signed invoice/contract — never close without paperwork',
    ],
  },
  {
    title: 'Test Drive',
    icon: '🛣️',
    items: [
      'Drive at least 20 minutes — including highway and city',
      'Test gearbox — smooth shifts through all gears',
      'Watch engine temperature — must not approach red zone',
      'Check exhaust — no white, black, or blue smoke',
      'Test radio, Bluetooth, backup camera, parking sensors',
      'Check for steering wheel vibration at highway speeds',
      'Test A/C cooldown speed and check for musty smell',
    ],
  },
];

export default async function ChecklistPage() {
  const locale = await getHostLocale();
  const isEn = locale === 'en';
  const GROUPS = isEn ? GROUPS_EN : GROUPS_HE;
  const title = isEn ? 'Used Car Buying Checklist' : 'רשימת בדיקה לקניית רכב יד שניה';
  const subtitle = isEn
    ? '40 critical checks before you sign — print or use on your phone'
    : '40 נקודות בדיקה לפני הרכישה — הדפיסו או פתחו בסמארטפון';
  const printLabel = isEn ? 'Print Checklist' : 'הדפסה';
  const totalItems = GROUPS.reduce((s, g) => s + g.items.length, 0);

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} className="page-section">
      <div className="container" style={{ maxWidth: 860 }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{title}</h1>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{subtitle}</p>
            <div style={{ marginTop: 10, display: 'inline-block', background: 'var(--accent)', color: '#fff', borderRadius: 99, padding: '4px 14px', fontSize: '0.8rem', fontWeight: 700 }}>
              {totalItems} {isEn ? 'checks' : 'נקודות'}
            </div>
          </div>
          <a
            href="javascript:window.print()"
            className="no-print"
            style={{
              border: '1px solid var(--border)', background: 'var(--surface)',
              borderRadius: 9, padding: '10px 20px', fontSize: '0.9rem',
              fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none', color: 'var(--text)',
            }}
          >
            🖨️ {printLabel}
          </a>
        </div>

        {/* Checklist groups */}
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: #fff !important; }
            .checklist-item label { cursor: default; }
          }
          .checklist-item input[type=checkbox]:checked + label {
            text-decoration: line-through; color: var(--text-muted); opacity: 0.6;
          }
          .checklist-item input[type=checkbox] { cursor: pointer; }
          .checklist-item label { cursor: pointer; }
        `}</style>

        <div style={{ display: 'grid', gap: 20 }}>
          {GROUPS.map(group => (
            <section key={group.title} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: '1.2rem' }}>{group.icon}</span>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{group.title}</h2>
                <span style={{ marginInlineStart: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {group.items.length} {isEn ? 'items' : 'נקודות'}
                </span>
              </div>
              <ul style={{ margin: 0, padding: '8px 0', listStyle: 'none' }}>
                {group.items.map((item, i) => (
                  <li key={i} className="checklist-item" style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 20px', borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <input
                      type="checkbox"
                      id={`${group.title}-${i}`}
                      style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: 'var(--accent)' }}
                    />
                    <label htmlFor={`${group.title}-${i}`} style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text)' }}>
                      {item}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div style={{
          marginTop: 36, padding: '20px 24px',
          background: 'linear-gradient(135deg, #0f2c4d, #1b4f8a)',
          borderRadius: 14, display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between', gap: 14,
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {isEn ? 'Found an issue? Check the car\'s history first' : 'מצאת בעיה? בדוק את הרקע של הרכב'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              {isEn ? 'Search reviews, common problems, and repair costs for any model' : 'חפש ביקורות, בעיות נפוצות ועלויות תיקון לכל דגם'}
            </div>
          </div>
          <a
            href="/cars"
            style={{
              background: '#fff', color: '#0f2c4d',
              padding: '10px 22px', borderRadius: 9,
              fontSize: '0.9rem', fontWeight: 800,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {isEn ? 'Search Models →' : 'חפש דגמים ←'}
          </a>
        </div>

      </div>
    </div>
  );
}
