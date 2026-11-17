import type { Metadata } from 'next';
import VehicleLookupLanding, { VEHICLE_LOOKUP_LANGS as LANGS } from '@/components/vehicle-lookup/VehicleLookupLanding';

export const revalidate = 3600;

const BASE = 'https://carissues.co.il';
const URL_RU = `${BASE}/ru/vehicle-lookup`;

export const metadata: Metadata = {
  title: { absolute: 'Проверка авто по номеру в Израиле: история авто бесплатно | CarIssues' },
  description: 'Как проверить историю авто в Израиле: введите номер машины и бесплатно получите техосмотр, историю владения, пробег, повреждения и отзывные кампании. Данные Министерства транспорта.',
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
