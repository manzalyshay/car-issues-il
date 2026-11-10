import { headers } from 'next/headers';
import { cookies } from 'next/headers';

export async function getHostLocale(): Promise<'en' | 'he'> {
  const host = (await headers()).get('host') ?? '';
  // Known production domains override everything
  if (host === 'carissues.net' || host === 'www.carissues.net' || host.startsWith('en.')) return 'en';
  if (host === 'carissues.co.il' || host === 'www.carissues.co.il') return 'he';
  // Unknown host (localhost/dev) - respect the clang preference cookie
  const pref = (await cookies()).get('clang')?.value;
  if (pref === 'en') return 'en';
  if (pref === 'he') return 'he';
  return 'he'; // default
}

export function getBaseUrl(locale: 'en' | 'he') {
  return locale === 'en' ? 'https://carissues.net' : 'https://carissues.co.il';
}

/**
 * Locale for pages that also serve the Russian pilot: 'ru' for /ru paths on carissues.co.il
 * (the middleware sets x-locale: ru), else the host locale. Hebrew/English-only pages keep
 * using getHostLocale().
 */
export async function getSiteLocale(): Promise<'en' | 'he' | 'ru'> {
  if ((await headers()).get('x-locale') === 'ru') return 'ru';
  return getHostLocale();
}
