/**
 * Small helpers for components shared by all three site languages.
 *
 * - he: carissues.co.il (Hebrew, RTL, Hebrew data fields)
 * - en: carissues.net (English, LTR, English data fields)
 * - ru: carissues.co.il/ru (Russian pilot, LTR, English data fields: Latin model names)
 *
 * Text goes through pick(locale, { he, en, ru }) so TypeScript requires all three, instead
 * of `isEn ? en : he` ternaries that silently show Hebrew on Russian pages. Data and layout
 * decisions use `locale === 'he'` (Hebrew data, RTL) explicitly.
 */
import type { Locale } from './translations';
import { RU_COMPARE_PATHS } from '@/data/ru-compare-pairs';

export type { Locale };
export type Tri<T = string> = { he: T; en: T; ru: T };

export function pick<T>(locale: Locale, v: Tri<T>): T {
  return v[locale];
}

/** Does this site path have a Russian page under /ru? (Only the pilot pages do.) */
export function hasRuPage(path: string): boolean {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (p === '/' || p === '/vehicle-lookup' || /^\/vehicle-lookup\/[^/]+$/.test(p)) return true;
  const m = p.match(/^\/cars\/compare\/([^/]+\/[^/]+)\/([^/]+\/[^/]+)$/);
  if (!m) return false;
  const [c1, c2] = [m[1], m[2]].sort();
  return RU_COMPARE_PATHS.has(`/cars/compare/${c1}/${c2}`);
}

/**
 * The URL of a site page in the current language. On the Russian site, pages that exist in
 * Russian keep their /ru URL (/ru, /ru/vehicle-lookup, /ru/cars/compare/...); everything else
 * links to the Hebrew page as-is. he/en are host-based, so paths are unchanged there.
 */
export function localHref(locale: Locale, path: string): string {
  if (locale !== 'ru' || !path.startsWith('/') || path.startsWith('/ru')) return path;
  if (!hasRuPage(path)) return path;
  const [, rest = ''] = path.match(/^[^?#]*([?#].*)?$/) ?? [];
  const base = path.slice(0, path.length - rest.length).replace(/\/+$/, '');
  if (base === '') return `/ru${rest}`;
  const m = base.match(/^\/cars\/compare\/([^/]+\/[^/]+)\/([^/]+\/[^/]+)$/);
  if (m) {
    const [c1, c2] = [m[1], m[2]].sort();
    return `/ru/cars/compare/${c1}/${c2}${rest}`;
  }
  return `/ru${base}${rest}`;
}
