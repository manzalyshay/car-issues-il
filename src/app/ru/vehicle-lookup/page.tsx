import type { Metadata } from 'next';
import RuPlateForm from '@/components/ru/RuPlateForm';
import { getAllMakes } from '@/lib/carsDb';
import { resolvePairs } from '@/lib/comparePairs';
import { RU_COMPARE_PAIRS } from '@/data/ru-compare-pairs';
import { RuHero, RuEyebrow, RuSectionHead, RuVsGrid, RuStyles, RU_GUTTER } from '@/components/ru/RuUi';

export const revalidate = 3600;

const BASE = 'https://carissues.co.il';
const URL_RU = `${BASE}/ru/vehicle-lookup`;
const LANGS = { 'he': `${BASE}/vehicle-lookup`, 'ru-IL': URL_RU, 'x-default': `${BASE}/vehicle-lookup` };

export const metadata: Metadata = {
  title: { absolute: 'Проверка авто по номеру в Израиле — бесплатно | CarIssues' },
  description: 'Бесплатная проверка автомобиля по израильскому номеру: техосмотр, история владения, пробег, повреждения, отзывные кампании и технические данные. Данные Министерства транспорта.',
  alternates: { canonical: URL_RU, languages: LANGS },
  openGraph: {
    title: 'Проверка авто по номеру в Израиле | CarIssues',
    description: 'Техосмотр, владельцы, пробег и повреждения по номеру автомобиля. Бесплатно, без регистрации.',
    url: URL_RU, locale: 'ru_IL',
  },
};

const FEATURES = [
  { icon: '📋', title: 'Данные автомобиля', desc: 'Марка, модель, год выпуска, цвет, тип топлива' },
  { icon: '🔧', title: 'Техосмотр и лицензия', desc: 'Дата последнего техосмотра («теста») и срок действия лицензии' },
  { icon: '👥', title: 'История владения', desc: 'Частная, лизинг, прокат или компания, и сколько раз менялся тип владения' },
  { icon: '🔢', title: 'Пробег', desc: 'Пробег на последнем техосмотре, если он есть в базе Министерства' },
  { icon: '⚠️', title: 'Повреждения и перекраска', desc: 'Зарегистрированное повреждение или перекраска, если есть запись' },
  { icon: '📢', title: 'Отзывные кампании', desc: 'Отзывные кампании по модели в Израиле и США' },
];

const STEPS = [
  { title: 'Введите номер', desc: 'Номер автомобиля с номерного знака: 7 или 8 цифр' },
  { title: 'Мгновенный поиск', desc: 'Мы ищем запись в открытой базе Министерства транспорта' },
  { title: 'Получите отчёт', desc: 'Все данные сразу на экране — без регистрации и бесплатно' },
];

const FAQ = [
  { q: 'Как проверить автомобиль по номеру в Израиле?', a: 'Введите номер автомобиля (7 или 8 цифр) в поле выше и нажмите «Проверить». Вы сразу увидите данные из базы Министерства транспорта: модель и год, техосмотр, тип владения, пробег на последнем техосмотре и зарегистрированные повреждения.' },
  { q: 'Проверка бесплатная?', a: 'Да. Проверка по номеру на CarIssues полностью бесплатная, без регистрации и без подписки.' },
  { q: 'Откуда берутся данные?', a: 'Из открытой базы data.gov.il, которую ведёт Министерство транспорта Израиля. Данные обновляются раз в сутки.' },
  { q: 'Можно ли узнать, был ли автомобиль в аварии?', a: 'Если в базе Министерства транспорта зарегистрировано повреждение, оно будет показано в отчёте. Отсутствие записи не гарантирует, что аварий не было, поэтому перед покупкой стоит проверить автомобиль в гараже или в институте проверки.' },
  { q: 'Как узнать, сколько было владельцев?', a: 'В отчёте есть история владения: периоды частного владения, лизинга, проката или компании по данным Министерства. Это регистрационные записи, а не обязательно фактическая продажа автомобиля.' },
  { q: 'Что проверить перед покупкой подержанного автомобиля?', a: 'Сравните пробег с возрастом автомобиля, проверьте срок техосмотра и историю владения (бывший лизинговый или прокатный автомобиль обычно ездил больше), посмотрите отзывные кампании по модели и обязательно сделайте осмотр в гараже до сделки.' },
];

export default async function RuVehicleLookupPage() {
  const makes = await getAllMakes().catch(() => []);
  const pairs = resolvePairs(makes, RU_COMPARE_PAIRS).slice(0, 8);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication', name: 'Проверка авто по номеру — CarIssues', url: URL_RU, inLanguage: 'ru',
        applicationCategory: 'UtilityApplication', operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
        description: 'Бесплатная проверка израильского автомобиля по номеру: данные Министерства транспорта.',
      },
      { '@type': 'FAQPage', inLanguage: 'ru', mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      {
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${BASE}/ru` },
          { '@type': 'ListItem', position: 2, name: 'Проверка авто по номеру', item: URL_RU },
        ],
      },
    ],
  };

  const wrap: React.CSSProperties = { maxWidth: 880, margin: '0 auto', padding: `clamp(36px,4vw,56px) ${RU_GUTTER} 0` };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', direction: 'ltr' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RuStyles />

      <RuHero center>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <RuEyebrow>Бесплатно · без регистрации</RuEyebrow>
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(28px,3.6vw,44px)', lineHeight: 1.12, letterSpacing: '-.03em', color: '#fff', margin: '10px 0 22px' }}>Проверка авто по номеру</h1>
          <div style={{ width: '100%', maxWidth: 520, textAlign: 'left' }}>
            <RuPlateForm autoFocus />
          </div>
          <p style={{ color: '#b8c8e4', fontSize: 'clamp(15px,1.2vw,17px)', lineHeight: 1.65, margin: '20px 0 0', maxWidth: 600 }}>
            Введите номер израильского автомобиля и сразу получите данные Министерства транспорта: техосмотр, историю владения, пробег, повреждения и технические данные.
          </p>
          <p style={{ color: '#7f93b5', fontSize: 12.5, margin: '12px 0 0' }}>Источник: Министерство транспорта Израиля (data.gov.il)</p>
        </div>
      </RuHero>

      <section style={wrap} aria-labelledby="ru-shows">
        <RuSectionHead id="ru-shows" title="Что показывает проверка" sub="Хороший первый шаг перед покупкой подержанного автомобиля. Проверка показывает то, что зарегистрировано в Министерстве транспорта, но не техническое состояние машины, поэтому не заменяет осмотр в гараже." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,250px), 1fr))', gap: 14 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 15, margin: '2px 0 4px' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#fff', borderBlock: '1px solid var(--border)', marginTop: 'clamp(36px,4vw,56px)' }} aria-labelledby="ru-how">
        <div style={{ ...wrap, paddingBottom: 'clamp(32px,3.6vw,48px)' }}>
          <RuSectionHead id="ru-how" title="Как это работает" />
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,220px), 1fr))', gap: 20 }}>
            {STEPS.map((st, i) => (
              <li key={st.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 15.5, margin: '6px 0 4px' }}>{st.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{st.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section style={wrap} aria-labelledby="ru-faq">
        <RuSectionHead id="ru-faq" title="Частые вопросы" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ.map(({ q, a }) => (
            <div key={q} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px' }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>{q}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {pairs.length > 0 && (
        <section style={{ ...wrap, paddingBottom: 'clamp(40px,4.5vw,64px)' }} aria-labelledby="ru-pairs">
          <RuSectionHead id="ru-pairs" title="Популярные сравнения" link={{ href: '/ru#compare', label: 'Все сравнения →' }} />
          <RuVsGrid pairs={pairs} compact min={320} />
        </section>
      )}
    </div>
  );
}
