import type { Metadata } from 'next';
import VehicleLookupLanding from '@/components/vehicle-lookup/VehicleLookupLanding';

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

/** Russian plate-lookup landing (/ru/vehicle-lookup): the shared landing page in Russian. */
export default function RuVehicleLookupPage() {
  return <VehicleLookupLanding locale="ru" />;
}
