'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';
import type { Locale, Translations } from './translations';

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  dir: 'rtl' | 'ltr';
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'he',
  setLocale: () => {},
  t: translations.he as Translations,
  dir: 'rtl',
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('he');

  useEffect(() => {
    // Auto-detect English from hostname (en.carissues.co.il)
    const isEnDomain = typeof window !== 'undefined' && window.location.hostname.startsWith('en.');
    if (isEnDomain) { setLocaleState('en'); return; }
    try {
      const stored = localStorage.getItem('locale') as Locale | null;
      if (stored === 'en' || stored === 'he') setLocaleState(stored);
    } catch {}
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem('locale', l); } catch {}
  }, []);

  const dir = locale === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.body.style.direction = dir;
  }, [locale, dir]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] as Translations, dir }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
