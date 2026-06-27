import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import { TRIM_FEATURES } from '@/data/cars';
import { getHostLocale } from '@/lib/hostLocale';

export const dynamic = 'force-static';
export const revalidate = 86400;

interface Props { params: Promise<{ make: string; model: string; trimSlug: string }> }

const ENGINE_TYPE_HE: Record<string, string> = {
  petrol: 'בנזין', hybrid: 'היברידי', phev: 'PHEV (תקע)', electric: 'חשמלי', diesel: 'דיזל',
};
const ENGINE_TYPE_EN: Record<string, string> = {
  petrol: 'Petrol', hybrid: 'Hybrid', phev: 'PHEV (Plug-in)', electric: 'Electric', diesel: 'Diesel',
};
const TRANSMISSION_HE: Record<string, string> = {
  manual: 'ידני', automatic: 'אוטומטי', cvt: 'CVT', dct: 'DCT (דו-מצמד)',
};
const TRANSMISSION_EN: Record<string, string> = {
  manual: 'Manual', automatic: 'Automatic', cvt: 'CVT', dct: 'DCT (Dual-clutch)',
};
const DRIVE_HE: Record<string, string> = { fwd: 'קדמית', rwd: 'אחורית', awd: '4×4 / AWD' };
const DRIVE_EN: Record<string, string> = { fwd: 'Front-wheel Drive', rwd: 'Rear-wheel Drive', awd: '4×4 / AWD' };
const SEATS_HE: Record<string, string> = { fabric: 'בד', leatherette: 'דמוי-עור', leather: 'עור אמיתי' };
const SEATS_EN: Record<string, string> = { fabric: 'Fabric', leatherette: 'Leatherette', leather: 'Leather' };

const FEATURE_GROUPS_HE = [
  { label: 'טכנולוגיה', icon: '📱', keys: ['apple_carplay','wireless_carplay','wireless_charging','digital_cluster','hud','premium_audio'] },
  { label: 'בטיחות', icon: '🛡️', keys: ['aeb','adaptive_cruise','lane_keep','blind_spot','traffic_sign','rear_camera','camera_360','parking_sensors'] },
  { label: 'נוחות', icon: '✨', keys: ['heated_seats_front','heated_seats_rear','ventilated_seats','electric_seats','memory_seats','heated_steering','sunroof','panoramic_roof','keyless_entry','push_start','ambient_lighting','led_lights','auto_lights'] },
] as const;
const FEATURE_GROUPS_EN = [
  { label: 'Technology', icon: '📱', keys: ['apple_carplay','wireless_carplay','wireless_charging','digital_cluster','hud','premium_audio'] },
  { label: 'Safety', icon: '🛡️', keys: ['aeb','adaptive_cruise','lane_keep','blind_spot','traffic_sign','rear_camera','camera_360','parking_sensors'] },
  { label: 'Comfort', icon: '✨', keys: ['heated_seats_front','heated_seats_rear','ventilated_seats','electric_seats','memory_seats','heated_steering','sunroof','panoramic_roof','keyless_entry','push_start','ambient_lighting','led_lights','auto_lights'] },
] as const;

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug, trimSlug } = await params;
  const [locale, make, model, trims] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
    getTrimSpecs(makeSlug, modelSlug),
  ]);
  if (!make || !model) return {};
  const trim = trims.find(t => toTrimSlug(t.name) === trimSlug);
  if (!trim) return {};

  const year = model.years[0];
  const isEn = locale === 'en';
  const url = isEn
    ? `https://carissues.net/cars/${makeSlug}/${modelSlug}/trim/${trimSlug}`
    : `https://carissues.co.il/cars/${makeSlug}/${modelSlug}/trim/${trimSlug}`;

  if (isEn) {
    const hpStr = trim.engineHp ? ` · ${trim.engineHp} hp` : '';
    return {
      title: `${make.nameEn} ${model.nameEn} ${trim.name} ${year} — Specs & Features`,
      description: `Full specs for ${make.nameEn} ${model.nameEn} ${trim.name} ${year}.${hpStr} Technology, safety, and comfort features.`,
      alternates: { canonical: url },
      openGraph: {
        title: `${make.nameEn} ${model.nameEn} ${trim.name} | CarIssues`,
        description: `${make.nameEn} ${model.nameEn} ${trim.name} ${year}${hpStr}`,
        url,
      },
    };
  }

  const priceStr = trim.priceIls ? ` · מחיר מומלץ ₪${trim.priceIls.toLocaleString('he-IL')}` : '';
  const hpStr = trim.engineHp ? ` ${trim.engineHp} כ"ס` : '';
  return {
    title: `${make.nameHe} ${model.nameHe} ${trim.name} ${year} – מפרט, ציוד ומחיר`,
    description: `מפרט מלא של ${make.nameHe} ${model.nameHe} גימור ${trim.name} ${year}.${hpStr}${priceStr}. ציוד, בטיחות, נוחות וטכנולוגיה.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${make.nameHe} ${model.nameHe} ${trim.name} | CarIssues IL`,
      description: `${make.nameHe} ${model.nameHe} ${trim.name} ${year}${priceStr}`,
      url,
    },
  };
}

export async function generateStaticParams() {
  // Avoid running at build time without DB credentials
  return [];
}

export default async function TrimPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug, trimSlug } = await params;

  const [locale, make, model, trims] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
    getTrimSpecs(makeSlug, modelSlug),
  ]);

  if (!make || !model) notFound();

  const trim = trims.find(t => toTrimSlug(t.name) === trimSlug);
  if (!trim) notFound();

  const isEn = locale === 'en';
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;
  const year = model.years[0];
  const trimIndex = trims.findIndex(t => t.id === trim.id);
  const prevTrim = trimIndex > 0 ? trims[trimIndex - 1] : null;
  const nextTrim = trimIndex < trims.length - 1 ? trims[trimIndex + 1] : null;
  const FEATURE_GROUPS = isEn ? FEATURE_GROUPS_EN : FEATURE_GROUPS_HE;

  const pageUrl = isEn
    ? `https://carissues.net/cars/${makeSlug}/${modelSlug}/trim/${trimSlug}`
    : `https://carissues.co.il/cars/${makeSlug}/${modelSlug}/trim/${trimSlug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${make.nameEn} ${model.nameEn} ${trim.name} ${year}`,
    brand: { '@type': 'Brand', name: make.nameEn },
    url: pageUrl,
    description: isEn
      ? `${make.nameEn} ${model.nameEn} ${trim.name} ${year} — specs, features and equipment`
      : `${make.nameHe} ${model.nameHe} גימור ${trim.name} ${year} — מפרט ציוד ומחיר`,
    ...(trim.priceIls && {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'ILS',
        price: trim.priceIls,
        priceValidUntil: `${year + 1}-12-31`,
        availability: 'https://schema.org/InStock',
        url: pageUrl,
      },
    }),
  };

  const specs: { label: string; value: string }[] = [];
  if (isEn) {
    if (trim.engineType) specs.push({ label: 'Engine Type', value: ENGINE_TYPE_EN[trim.engineType] ?? trim.engineType });
    if (trim.engineCc) specs.push({ label: 'Displacement', value: `${trim.engineCc} cc` });
    if (trim.engineHp) specs.push({ label: 'Power', value: `${trim.engineHp} hp` });
    if (trim.transmission) specs.push({ label: 'Transmission', value: TRANSMISSION_EN[trim.transmission] ?? trim.transmission });
    if (trim.drive) specs.push({ label: 'Drive', value: DRIVE_EN[trim.drive] ?? trim.drive });
    if (trim.seats) specs.push({ label: 'Upholstery', value: SEATS_EN[trim.seats] ?? trim.seats });
    if (trim.seatCount) specs.push({ label: 'Seats', value: String(trim.seatCount) });
    if (trim.screenSize) specs.push({ label: 'Multimedia Screen', value: `${trim.screenSize}"` });
  } else {
    if (trim.engineType) specs.push({ label: 'סוג מנוע', value: ENGINE_TYPE_HE[trim.engineType] ?? trim.engineType });
    if (trim.engineCc) specs.push({ label: 'נפח מנוע', value: `${trim.engineCc} סמ"ק` });
    if (trim.engineHp) specs.push({ label: 'הספק', value: `${trim.engineHp} כ"ס` });
    if (trim.transmission) specs.push({ label: 'תיבת הילוכים', value: TRANSMISSION_HE[trim.transmission] ?? trim.transmission });
    if (trim.drive) specs.push({ label: 'הנעה', value: DRIVE_HE[trim.drive] ?? trim.drive });
    if (trim.seats) specs.push({ label: 'ריפוד', value: SEATS_HE[trim.seats] ?? trim.seats });
    if (trim.seatCount) specs.push({ label: 'מושבים', value: String(trim.seatCount) });
    if (trim.screenSize) specs.push({ label: 'מסך מולטימדיה', value: `${trim.screenSize}"` });
  }

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} className="page-section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container" style={{ maxWidth: 800 }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isEn ? 'Home' : 'בית'}</Link>
          <span>›</span>
          <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isEn ? 'Makes' : 'יצרנים'}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{makeName}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}/${model.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{modelName}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{isEn ? 'Trim' : 'גימור'} {trim.name}</span>
        </nav>

        {/* Title */}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 8 }}>
          {makeName} {modelName} — {isEn ? 'Trim' : 'גימור'} {trim.name}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          {make.nameEn} {model.nameEn} {trim.name} · {isEn ? 'Model year' : 'דגם'} {year}
        </p>

        {/* Price */}
        {trim.priceIls && (
          <div style={{
            background: 'var(--surface-2)',
            border: '2px solid var(--accent)',
            borderRadius: 12,
            padding: '16px 24px',
            marginBottom: 32,
            display: 'inline-flex',
            flexDirection: 'column',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{isEn ? 'Suggested retail price' : 'מחיר מומלץ לצרכן'}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)' }}>
              ₪{trim.priceIls.toLocaleString('he-IL')}
            </span>
          </div>
        )}

        {/* Specs grid */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>{isEn ? 'Technical Specifications' : 'מפרט טכני'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {specs.map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontWeight: 600 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        {FEATURE_GROUPS.map(group => {
          const featuresInGroup = group.keys.filter(k => trim.features.includes(k));
          if (featuresInGroup.length === 0) return null;
          return (
            <section key={group.label} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12 }}>{group.icon} {group.label}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {featuresInGroup.map(k => (
                  <span key={k} style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    color: 'var(--text)',
                  }}>
                    {isEn
                      ? (TRIM_FEATURES[k as keyof typeof TRIM_FEATURES]?.labelEn ?? k)
                      : (TRIM_FEATURES[k as keyof typeof TRIM_FEATURES]?.labelHe ?? k)}
                  </span>
                ))}
              </div>
            </section>
          );
        })}

        {/* Missing features note */}
        {(() => {
          const allKeys = FEATURE_GROUPS.flatMap(g => [...g.keys] as string[]);
          const missing = allKeys.filter(k => !trim.features.includes(k));
          if (missing.length === 0) return null;
          return (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>
                {isEn ? 'Not included in this trim' : 'לא כלול בגימור זה'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {missing.map(k => (
                  <span key={k} style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    textDecoration: 'line-through',
                    opacity: 0.6,
                  }}>
                    {isEn
                      ? (TRIM_FEATURES[k as keyof typeof TRIM_FEATURES]?.labelEn ?? k)
                      : (TRIM_FEATURES[k as keyof typeof TRIM_FEATURES]?.labelHe ?? k)}
                  </span>
                ))}
              </div>
            </section>
          );
        })()}

        {/* All trims nav */}
        <section style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>{isEn ? `All ${modelName} Trims` : `כל גימורי ${modelName}`}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {trims.map(t => {
              const slug = toTrimSlug(t.name);
              const active = slug === trimSlug;
              return (
                <Link
                  key={t.id}
                  href={`/cars/${make.slug}/${model.slug}/trim/${slug}`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: '0.9rem',
                    fontWeight: active ? 700 : 400,
                    background: active ? 'var(--accent)' : 'var(--surface-2)',
                    color: active ? '#fff' : 'var(--text)',
                    textDecoration: 'none',
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  {t.name}
                  {t.priceIls && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, marginRight: 6 }}>
                      ₪{Math.round(t.priceIls / 1000)}K
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Prev / Next */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          {prevTrim ? (
            <Link href={`/cars/${make.slug}/${model.slug}/trim/${toTrimSlug(prevTrim.name)}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
              ← {isEn ? 'Trim' : 'גימור'} {prevTrim.name}
            </Link>
          ) : <span />}
          {nextTrim ? (
            <Link href={`/cars/${make.slug}/${model.slug}/trim/${toTrimSlug(nextTrim.name)}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
              {isEn ? 'Trim' : 'גימור'} {nextTrim.name} →
            </Link>
          ) : <span />}
        </div>

        {/* Back link */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link
            href={`/cars/${make.slug}/${model.slug}`}
            style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            ← {isEn ? `Back to ${makeName} ${modelName}` : `חזרה ל${makeName} ${modelName}`}
          </Link>
        </div>

      </div>
    </div>
  );
}
