/**
 * UI strings for all three site languages. translations.ts holds he/en and
 * translations.ru.ts holds ru; they are separate files so the tests can import each one
 * directly. Code that may run on the Russian site uses uiStrings(locale).
 */
import { translations, type Locale, type Translations } from './translations';
import { ru } from './translations.ru';

export function uiStrings(locale: Locale): Translations {
  return (locale === 'ru' ? ru : translations[locale]) as Translations;
}
