'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';
import type { Locale, Translations } from './translations';

// Domains that force a specific locale - users switch by navigating to the other domain
const EN_DOMAINS = ['carissues.net', 'en.carissues.co.il'];
const HE_DOMAINS = ['carissues.co.il', 'www.carissues.co.il'];

export const EN_SITE = 'https://carissues.net';
export const HE_SITE = 'https://carissues.co.il';

function detectDomainLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (EN_DOMAINS.some(d => host === d || host.endsWith('.' + d))) return 'en';
  if (HE_DOMAINS.some(d => host === d)) return 'he';
  return null;
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  dir: 'rtl' | 'ltr';
  isDomainLocked: boolean; // true when domain forces the locale
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'he',
  setLocale: () => {},
  t: translations.he as Translations,
  dir: 'rtl',
  isDomainLocked: false,
});

export function LocaleProvider({ children, initialLocale, documentLang }: {
  children: React.ReactNode;
  initialLocale?: Locale;
  /** Overrides <html lang/dir> (the /ru pilot: lang="ru", ltr) while the UI strings stay `initialLocale`. */
  documentLang?: { lang: string; dir: 'ltr' | 'rtl' };
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? 'he');
  const [isDomainLocked, setIsDomainLocked] = useState(!!initialLocale);

  useEffect(() => {
    if (initialLocale) return; // server already determined locale - skip client detection
    const domainLocale = detectDomainLocale();
    if (domainLocale) {
      setLocaleState(domainLocale);
      setIsDomainLocked(true);
      return;
    }
    // Unknown host (localhost/dev) - read from localStorage and sync to cookie
    try {
      const stored = localStorage.getItem('locale') as Locale | null;
      if (stored === 'en' || stored === 'he') {
        document.cookie = `clang=${stored};path=/;max-age=31536000;samesite=lax`;
        setLocaleState(stored);
      }
    } catch {}
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('locale', l);
      document.cookie = `clang=${l};path=/;max-age=31536000;samesite=lax`;
    } catch {}
  }, []);

  const dir = locale === 'he' ? 'rtl' : 'ltr';

  const docLang = documentLang?.lang ?? locale;
  const docDir = documentLang?.dir ?? dir;
  useEffect(() => {
    document.documentElement.lang = docLang;
    document.documentElement.dir = docDir;
    document.body.style.direction = docDir;
  }, [docLang, docDir]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] as Translations, dir, isDomainLocked }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
