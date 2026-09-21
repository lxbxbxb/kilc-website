import en from './en.json';
import zh from './zh.json';
import es from './es.json';
import ms from './ms.json';
import { LOCALES, DEFAULT_LOCALE, isLocale } from './locales';
import type { Locale } from './locales';
import { pageIdForPath, pagePath } from './pages';

export type { Locale } from './locales';
export { LOCALES, DEFAULT_LOCALE } from './locales';

const translations: Record<Locale, unknown> = { en, zh, es, ms };

/**
 * Get a nested translation value by dot-separated key, e.g. t('en', 'nav.home').
 * Falls back to the English string when a key hasn't been translated yet for
 * `locale`, and to the key itself if it's missing everywhere — so a page never
 * renders blank while a new language is still being filled in.
 */
export function t(locale: Locale, key: string): string {
  const fromLocale = lookup(translations[locale], key);
  if (typeof fromLocale === 'string') return fromLocale;

  const fromEnglish = lookup(translations[DEFAULT_LOCALE], key);
  if (typeof fromEnglish === 'string') return fromEnglish;

  return key;
}

function lookup(source: unknown, key: string): unknown {
  let value: unknown = source;
  for (const k of key.split('.')) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return value;
}

/** Get the current locale from the URL pathname. */
export function getLocaleFromUrl(url: URL): Locale {
  const [, segment] = url.pathname.split('/');
  return segment && isLocale(segment) ? segment : DEFAULT_LOCALE;
}

/**
 * Get the equivalent URL for the same page in `targetLocale`. Falls back to
 * the English version of the page if it hasn't been translated into
 * `targetLocale` yet, and to the target locale's home page if the current
 * path isn't a registered page at all.
 */
export function getAlternateUrl(pathname: string, targetLocale: Locale): string {
  const id = pageIdForPath(pathname);
  if (!id) return pagePath('home', targetLocale);
  return pagePath(id, targetLocale);
}

/** Every locale other than `locale`, in display order. */
export function otherLocales(locale: Locale): Locale[] {
  return LOCALES.filter((l) => l !== locale);
}

/** The same key resolved in every supported locale — used by bilingual mode. */
export function tAll(key: string): Record<Locale, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, t(l, key)])) as Record<Locale, string>;
}
