import { getHostLocale } from '@/lib/hostLocale';
import HomePage from '@/components/home/HomePage';

export const revalidate = 300; // cache home page for 5 minutes

// Hreflang for the home page only: it is the one page with a Russian counterpart (/ru)
// besides the pilot pages themselves, which set their own.
export async function generateMetadata(): Promise<import('next').Metadata> {
  const locale = await getHostLocale();
  const canonical = locale === 'en' ? 'https://carissues.net' : 'https://carissues.co.il';
  return {
    alternates: {
      canonical,
      languages: { he: 'https://carissues.co.il', 'ru-IL': 'https://carissues.co.il/ru', en: 'https://carissues.net', 'x-default': 'https://carissues.net' },
    },
  };
}

export default async function Page() {
  const locale = await getHostLocale().catch(() => 'he' as const);
  return <HomePage locale={locale} />;
}
