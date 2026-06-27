import { headers } from 'next/headers';

export async function getHostLocale(): Promise<'en' | 'he'> {
  const host = (await headers()).get('host') ?? '';
  return host === 'carissues.net' || host === 'www.carissues.net' || host.startsWith('en.')
    ? 'en'
    : 'he';
}

export function getBaseUrl(locale: 'en' | 'he') {
  return locale === 'en' ? 'https://carissues.net' : 'https://carissues.co.il';
}
