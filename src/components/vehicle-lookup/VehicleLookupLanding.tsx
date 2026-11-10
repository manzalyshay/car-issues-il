/**
 * Plate-lookup landing page for all three languages: /vehicle-lookup on carissues.co.il (he)
 * and carissues.net (en), and /ru/vehicle-lookup (ru). Each route sets its own metadata.
 */
import Link from 'next/link';
import { getBaseUrl } from '@/lib/hostLocale';
import PlateSearch from '@/components/PlateSearch';
import { pick, type Locale, type Tri } from '@/lib/i18n';

const RU = {
  features: [
    { icon: '📋', title: 'Данные автомобиля', desc: 'Марка, модель, год выпуска, цвет, тип топлива' },
    { icon: '🔧', title: 'Техосмотр и лицензия', desc: 'Дата последнего техосмотра («теста») и срок действия лицензии' },
    { icon: '⚠️', title: 'Повреждения и перекраска', desc: 'Зарегистрированное повреждение или перекраска, если есть запись' },
    { icon: '🔢', title: 'Пробег', desc: 'Пробег на последнем техосмотре, если он есть в базе Министерства' },
    { icon: '🪪', title: 'VIN и тип владения', desc: 'Номер шасси (VIN) и тип владения: частное, лизинг, прокат или компания' },
    { icon: '🌍', title: 'Происхождение', desc: 'Официальный импорт, параллельный импорт из Европы, США или другой страны — если есть запись' },
    { icon: '📢', title: 'Отзывные кампании', desc: 'Отзывные кампании по модели в Израиле и США' },
    { icon: '⭐', title: 'Проблемы и отзывы', desc: 'Типичные проблемы модели и отзывы владельцев, если они есть на сайте (на иврите)' },
  ],
  steps: [
    { n: '1', title: 'Введите номер', desc: 'Номер автомобиля с номерного знака: 7 или 8 цифр' },
    { n: '2', title: 'Мгновенный поиск', desc: 'Мы ищем запись в открытой базе Министерства транспорта' },
    { n: '3', title: 'Получите отчёт', desc: 'Все данные сразу на экране — без регистрации и бесплатно' },
  ],
  why: [
    { icon: '🆓', title: 'Полностью бесплатно', desc: 'Без оплаты, подписки и «бесплатных проверок с ограничением»' },
    { icon: '🚫', title: 'Без рекламы', desc: 'Чистый интерфейс — без всплывающих окон и баннеров' },
    { icon: '🔓', title: 'Без регистрации', desc: 'Не нужно создавать аккаунт или оставлять личные данные' },
    { icon: '⚡', title: 'Мгновенный результат', desc: 'Данные Министерства транспорта — за несколько секунд' },
  ],
  faqs: [
    { q: 'Как проверить автомобиль по номеру в Израиле?', a: 'Введите номер автомобиля (7 или 8 цифр) в поле выше и нажмите «Проверить». Вы сразу увидите данные из базы Министерства транспорта: модель и год, техосмотр, тип владения, пробег на последнем техосмотре и зарегистрированные повреждения.' },
    { q: 'Проверка бесплатная?', a: 'Да. Проверка по номеру на CarIssues полностью бесплатная, без регистрации и без подписки.' },
    { q: 'Откуда берутся данные?', a: 'Из открытой базы data.gov.il, которую ведёт Министерство транспорта Израиля. Данные обновляются раз в сутки.' },
    { q: 'Можно ли узнать, был ли автомобиль в аварии?', a: 'Если в базе Министерства транспорта зарегистрировано повреждение, оно будет показано в отчёте. Отсутствие записи не гарантирует, что аварий не было, поэтому перед покупкой стоит проверить автомобиль в гараже или в институте проверки.' },
    { q: 'Как узнать, сколько было владельцев?', a: 'В отчёте есть история владения: периоды частного владения, лизинга, проката или компании по данным Министерства. Это регистрационные записи, а не обязательно фактическая продажа автомобиля.' },
    { q: 'Что проверить перед покупкой подержанного автомобиля?', a: 'Сравните пробег с возрастом автомобиля, проверьте срок техосмотра и историю владения (бывший лизинговый или прокатный автомобиль обычно ездил больше), посмотрите отзывные кампании по модели и обязательно сделайте осмотр в гараже до сделки.' },
  ],
};

export default function VehicleLookupLanding({ locale }: { locale: Locale }) {
  const isHe = locale === 'he';
  const isRu = locale === 'ru';
  // Russian pages live under /ru on the Hebrew host
  const base = isRu ? 'https://carissues.co.il/ru' : getBaseUrl(locale);
  const tr = (v: Tri) => pick(locale, v);

  const features = pick(locale, { he: [
    { icon: '📋', title: 'פרטי רכב מלאים', desc: 'יצרן, דגם, שנת ייצור, צבע, סוג דלק' },
    { icon: '🔧', title: 'תוקף טסט ורישיון', desc: 'תאריך הטסט האחרון ותאריך פקיעת הרישיון' },
    { icon: '⚠️', title: 'נזק וצביעה', desc: 'האם נרשמה תאונה? האם הרכב צובע מחדש? (כשהמידע קיים ברשומות)' },
    { icon: '🔢', title: 'קילומטראז׳', desc: 'מד-האוץ בטסט האחרון - כשקיים במאגר משרד התחבורה' },
    { icon: '🪪', title: 'מספר שלדה ובעלות', desc: 'מספר שלדה (VIN) וסוג הבעלות (פרטי / עסקי)' },
    { icon: '🌍', title: 'מקור הרכב', desc: 'רכב מקורי, מיובא מאירופה, ארה"ב או אחר - כשקיים' },
    { icon: '📢', title: 'ריקולים לדגם', desc: 'קריאות שירות (ריקולים) שפורסמו לדגם, בישראל ובארה"ב' },
    { icon: '⭐', title: 'בעיות נפוצות וביקורות', desc: 'הבעיות הנפוצות בדגם, ביקורות בעלים ומחיר מחירון - כשקיימים באתר' },
  ], en: [
    { icon: '📋', title: 'Full Vehicle Details', desc: 'Make, model, year, color, fuel type' },
    { icon: '🔧', title: 'Test & License Status', desc: 'Last test date and license expiry - instantly' },
    { icon: '⚠️', title: 'Damage & Repaint', desc: 'Recorded accident or repaint - when available in Ministry records' },
    { icon: '🔢', title: 'Odometer Reading', desc: 'Mileage at last test - when available in Ministry of Transport records' },
    { icon: '🪪', title: 'VIN & Ownership Type', desc: 'Vehicle frame number and ownership type (private / business)' },
    { icon: '🌍', title: 'Vehicle Origin', desc: 'Original, European import, US or other - when recorded' },
    { icon: '📢', title: 'Model Recalls', desc: 'Recall campaigns published for the model, in Israel and the US' },
    { icon: '⭐', title: 'Common Problems & Reviews', desc: 'The model\'s common problems and owner reviews - when we have them' },
  ], ru: RU.features });

  const steps = pick(locale, { he: [
    { n: '1', title: 'הזן מספר רישוי', desc: 'הקלד את מספר הלוחית של הרכב (7 או 8 ספרות לרכב ישראלי)' },
    { n: '2', title: 'בדיקה מיידית', desc: 'המערכת מחפשת ברשומות משרד התחבורה בזמן אמת' },
    { n: '3', title: 'קבל את הדו"ח', desc: 'צפה בכל הנתונים מיד - ללא הרשמה, ללא עלות' },
  ], en: [
    { n: '1', title: 'Enter the plate number', desc: 'Type the vehicle\'s license plate (7 or 8 digits for Israeli plates, or a UK plate such as AB12 CDE)' },
    { n: '2', title: 'Instant lookup', desc: 'We query the Ministry of Transport records in real time' },
    { n: '3', title: 'Get the full report', desc: 'View all details immediately - no registration, no cost' },
  ], ru: RU.steps });

  const faqs = pick(locale, { he: [
    {
      q: 'מה ניתן לבדוק לפי מספר רישוי?',
      a: 'ניתן לבדוק: שם הרכב (יצרן + דגם), שנת ייצור, צבע, סוג דלק, תוקף טסט ורישיון, מסגרת (VIN), בעלות, קילומטראז׳ בטסט האחרון, היסטוריית נזק ומקור הרכב - ישירות ממשרד התחבורה. בנוסף מוצגים ריקולים לדגם, בעיות נפוצות וביקורות בעלים, כשהם קיימים באתר.',
    },
    {
      q: 'האם השירות בחינם?',
      a: 'כן, בדיקת רכב לפי מספר רישוי היא חינמית לחלוטין באתר CarIssues. אין צורך בהרשמה, אין מנוי ואין פרסומות. המידע מוצג מיד, בחינם.',
    },
    {
      q: 'איך לבדוק עבר רכב לפני קנייה?',
      a: 'לפני רכישת רכב יד שנייה מומלץ לבדוק: כמה בעלים היו לרכב, האם נרשם נזק בתאונה, מה הקילומטראז׳ בטסט האחרון, והאם תוקף הטסט תקף. הכניסו את מספר הרישוי בשדה למעלה וכל המידע יוצג מיד.',
    },
    {
      q: 'איך בודקים תאונות לפי מספר רכב?',
      a: 'הזינו את מספר הרכב בשדה למעלה. אם במאגר משרד התחבורה נרשם נזק לרכב, הוא יופיע בדו"ח. היעדר רישום לא מוכיח שהרכב לא עבר תאונה, ולכן לפני קנייה כדאי לבדוק אותו גם במכון בדיקה.',
    },
    {
      q: 'כמה בעלים היו לרכב - איך בודקים?',
      a: 'בדיקת הרכב לפי מספר רישוי מציגה את מספר העברות הבעלות הרשומות במשרד התחבורה. מספר בעלים גבוה יחסית לגיל הרכב יכול להיות סימן לבעיות. הזינו את מספר הרישוי לבדיקה מיידית.',
    },
    {
      q: 'מה ההבדל בין בדיקה כאן לבין אתרים אחרים?',
      a: 'רוב האתרים גובים תשלום, דורשים הרשמה, או מציגים פרסומות מסיחות. CarIssues מציג את אותו המידע - ישירות ממשרד התחבורה - בחינם, ללא פרסומות וללא הרשמה, בממשק נקי וברור.',
    },
    {
      q: 'מאיפה המידע?',
      a: 'הנתונים מגיעים ישירות מ-data.gov.il - מסד הנתונים הפתוח של ממשלת ישראל ומשרד התחבורה.',
    },
    {
      q: 'האם ניתן לבדוק רכב אנגלי (בריטי)?',
      a: 'כן! ניתן להזין לוחית רישוי בריטית (למשל AB12 CDE) כדי לבדוק רכב בריטי מול מסד הנתונים של DVLA.',
    },
  ], en: [
    {
      q: 'What information can I check by license plate?',
      a: 'You can check: vehicle name (make + model), year, color, fuel type, MOT and license expiry, VIN/frame number, ownership count, odometer at last test, damage history and vehicle origin - all directly from Israel\'s Ministry of Transport.',
    },
    {
      q: 'Is this service free?',
      a: 'Yes, completely free. No registration, no subscription, no ads. Enter a plate number and get the full report instantly - no strings attached.',
    },
    {
      q: 'How do I check a vehicle\'s history before buying?',
      a: 'Enter the license plate in the search box above. You\'ll instantly see ownership count, any recorded damage, odometer at last MOT, and whether the MOT is still valid - everything you need to make an informed purchase decision.',
    },
    {
      q: 'How accurate is the data?',
      a: 'The data comes directly from Israel\'s official government database (data.gov.il) and is updated in real time. The information reflects what is officially registered with the Ministry of Transport.',
    },
    {
      q: 'Can I check a UK vehicle?',
      a: 'Yes. Enter a UK registration plate (e.g. AB12 CDE) and we\'ll look it up via the DVLA database, showing MOT status, tax status, make, year and fuel type.',
    },
    {
      q: 'What does the damage history field mean?',
      a: 'This indicates whether the vehicle has a recorded accident in the Ministry of Transport database. A "no damage recorded" result doesn\'t guarantee the vehicle was never in an accident - only that none was officially registered.',
    },
  ], ru: RU.faqs });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: tr({ he: 'בדיקת רכב לפי מספר רישוי - CarIssues', en: 'Israeli License Plate Lookup - CarIssues', ru: 'Проверка авто по номеру — CarIssues' }),
        inLanguage: locale,
        url: `${base}/vehicle-lookup`,
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
        description: tr({
          he: 'כלי חינמי לבדיקת רכב ישראלי לפי מספר רישוי - נתונים ממשרד התחבורה',
          en: 'Free tool to check any Israeli vehicle by license plate - live data from Ministry of Transport',
          ru: 'Бесплатная проверка израильского автомобиля по номеру: данные Министерства транспорта.',
        }),
      },
      {
        '@type': 'FAQPage',
        inLanguage: locale,
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: tr({ he: 'בית', en: 'Home', ru: 'Главная' }), item: base },
          { '@type': 'ListItem', position: 2, name: tr({ he: 'בדיקת רכב', en: 'Vehicle Check', ru: 'Проверка авто по номеру' }), item: `${base}/vehicle-lookup` },
        ],
      },
    ],
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', direction: isHe ? 'rtl' : 'ltr' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '48px 0 40px' }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: '#60a5fa', textTransform: 'uppercase', marginBottom: 10 }}>
            {tr({ he: 'כלי חינמי', en: 'Free Tool', ru: 'Бесплатно · без регистрации' })}
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2, marginBottom: 20 }}>
            {tr({ he: 'בדיקת רכב לפי מספר רישוי', en: 'Israeli License Plate Lookup', ru: 'Проверка авто по номеру' })}
          </h1>
          {/* Plate input first - it's what visitors come here for */}
          <PlateSearch isHe={isHe} lang={locale} navigateOnSearch />
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.7, marginTop: 20, marginBottom: 0, maxWidth: 560 }}>
            {tr({
              he: 'הזן מספר לוחית רישוי וקבל מיד את כל הפרטים - תוקף טסט, היסטוריית נזק, קילומטראז׳ ועוד, ישירות ממשרד התחבורה.',
              en: 'Enter any Israeli license plate and instantly get full vehicle details - MOT status, damage history, odometer reading and more, live from Israel\'s Ministry of Transport.',
              ru: 'Введите номер израильского автомобиля и сразу получите данные Министерства транспорта: техосмотр, историю владения, пробег, повреждения и технические данные.',
            })}
          </p>
          {isHe && (
            <p style={{ margin: '12px 0 0', fontSize: '0.85rem' }}>
              <Link href="/ru/vehicle-lookup" lang="ru" hrefLang="ru" style={{ color: "#93c5fd", fontWeight: 600, textDecoration: "none" }}>Проверка авто по номеру на русском →</Link>
            </p>
          )}
          <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: 14 }}>
            {tr({ he: 'מקור: משרד התחבורה (data.gov.il)', en: 'Source: Israel Ministry of Transport (data.gov.il)', ru: 'Источник: Министерство транспорта Израиля (data.gov.il)' })}
          </p>
        </div>
      </div>

      {/* ── WHAT YOU GET ── */}
      <div className="container" style={{ maxWidth: 760, padding: '48px 16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 10 }}>
          {tr({ he: 'בדיקת היסטוריית רכב לפי מספר, בחינם', en: 'Check a car\'s history by plate number, free', ru: 'Бесплатная проверка истории автомобиля по номеру' })}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: 40 }}>
          {tr({
            he: 'בדיקת רכב לפי מספר רישוי היא צעד ראשון טוב לפני קניית רכב יד שנייה. מזינים את מספר הרכב ורואים את מה שרשום במשרד התחבורה: תוקף טסט, קילומטראז׳ בטסט האחרון, היסטוריית בעלות ונזק, כשהוא מופיע במאגר. הבדיקה מראה מה נרשם, לא את מצבו המכני של הרכב, ולכן היא לא מחליפה בדיקה במכון.',
            en: 'Checking a car by its plate number is a good first step before buying used. Enter the plate to see what the Ministry of Transport has on record: test validity, odometer at the last test, ownership history and damage, when it appears in the database. The check shows what was recorded, not the car\'s mechanical condition, so it doesn\'t replace an inspection at a garage.',
            ru: 'Проверка по номеру — хороший первый шаг перед покупкой подержанного автомобиля. Она показывает то, что зарегистрировано в Министерстве транспорта: техосмотр, пробег на последнем техосмотре, историю владения и повреждения, если они есть в базе. Это записи, а не техническое состояние машины, поэтому проверка не заменяет осмотр в гараже.',
          })}
        </p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
          {tr({ he: 'מה תקבל בבדיקה?', en: 'What does the check include?', ru: 'Что показывает проверка' })}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
          {tr({ he: 'כל הנתונים מגיעים ישירות ממאגרי ממשלת ישראל בזמן אמת', en: 'All data is pulled in real time from official Israeli government databases', ru: 'Все данные берутся из официальных баз правительства Израиля' })}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {features.map(f => (
            <div key={f.title} className="card" style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 3 }}>{f.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 760, padding: '40px 16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 28 }}>
            {tr({ he: 'איך זה עובד?', en: 'How it works', ru: 'Как это работает' })}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {steps.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                  color: '#fff', fontWeight: 900, fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WHY CARISSUES ── */}
      <div className="container" style={{ maxWidth: 760, padding: '48px 16px 0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 20 }}>
          {tr({ he: 'למה CarIssues ולא אתרים אחרים?', en: 'Why CarIssues over other services?', ru: 'Почему CarIssues' })}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {pick(locale, { he: [
            { icon: '🆓', title: 'חינם לחלוטין', desc: 'אין תשלום, אין מנוי, אין "בדיקות מוגבלות בחינם"' },
            { icon: '🚫', title: 'ללא פרסומות', desc: 'ממשק נקי - בלי פרסומות מסיחות ובלי חלונות קופצים' },
            { icon: '🔓', title: 'ללא הרשמה', desc: 'אין צורך ליצור חשבון או למסור פרטים אישיים' },
            { icon: '⚡', title: 'תוצאות מיידיות', desc: 'הנתונים מגיעים ישירות ממשרד התחבורה - בשניות' },
          ], en: [
            { icon: '🆓', title: 'Completely free', desc: 'No payment, no subscription, no "limited free checks"' },
            { icon: '🚫', title: 'No ads', desc: 'Clean interface - no pop-ups, no banner ads, no distractions' },
            { icon: '🔓', title: 'No registration', desc: 'No account needed, no personal details required' },
            { icon: '⚡', title: 'Instant results', desc: 'Data pulled directly from Ministry of Transport in seconds' },
          ], ru: RU.why }).map(item => (
            <div key={item.title} className="card" style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 3 }}>{item.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="container" style={{ maxWidth: 760, padding: '48px 16px 64px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 28 }}>
          {tr({ he: 'שאלות נפוצות', en: 'Frequently Asked Questions', ru: 'Частые вопросы' })}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map(({ q, a }) => (
            <div key={q} className="card" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 8 }}>{q}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
