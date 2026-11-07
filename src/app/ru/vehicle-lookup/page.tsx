import type { Metadata } from 'next';
import Link from 'next/link';
import RuPlateForm from '@/components/ru/RuPlateForm';
import { getAllMakes } from '@/lib/carsDb';
import { resolvePairs } from '@/lib/comparePairs';
import { RU_COMPARE_PAIRS } from '@/data/ru-compare-pairs';

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
  const pairs = resolvePairs(makes, RU_COMPARE_PAIRS).slice(0, 12);

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

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', direction: 'ltr' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '40px 0 36px' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: '#60a5fa', textTransform: 'uppercase', marginBottom: 10 }}>Бесплатно · без регистрации</div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4.5vw, 2.4rem)', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2, margin: '0 0 18px' }}>Проверка авто по номеру</h1>
          <RuPlateForm autoFocus />
          <p style={{ color: '#a5b4c8', fontSize: '1rem', lineHeight: 1.7, margin: '18px 0 0', maxWidth: 600 }}>
            Введите номер израильского автомобиля и сразу получите данные Министерства транспорта: техосмотр, историю владения, пробег, повреждения и технические данные.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '12px 0 0' }}>Источник: Министерство транспорта Израиля (data.gov.il)</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 800, paddingBlock: '44px 0' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 10px' }}>Что показывает проверка</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 24px' }}>
          Проверка по номеру — хороший первый шаг перед покупкой подержанного автомобиля. Она показывает то, что зарегистрировано в Министерстве транспорта, но не техническое состояние машины, поэтому не заменяет осмотр в гараже.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card" style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '0.92rem', margin: '0 0 3px' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container" style={{ maxWidth: 800, paddingBlock: '44px 0' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 18px' }}>Частые вопросы</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ.map(({ q, a }) => (
            <div key={q} className="card" style={{ padding: '16px 20px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.98rem', margin: '0 0 8px' }}>{q}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{a}</p>
            </div>
          ))}
        </div>
      </div>

      {pairs.length > 0 && (
        <div className="container" style={{ maxWidth: 800, paddingBlock: '44px 64px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 14px' }}>Популярные сравнения</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {pairs.map((p) => (
              <Link key={p.path} href={`/ru${p.path}`} className="card" style={{ padding: '12px 14px', textDecoration: 'none', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
                {p.a.make.nameEn} {p.a.model.nameEn} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>или</span> {p.b.make.nameEn} {p.b.model.nameEn}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
