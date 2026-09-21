/**
 * Supported languages are options a visitor picks, not an identity assigned
 * to them by geography. Adding a language means adding an entry here plus a
 * translation file — no page markup should hardcode a language list.
 */
export const LOCALES = ['en', 'zh', 'es', 'ms'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

interface LocaleMeta {
  /** Name of the language written in itself, shown in the language picker. */
  nativeName: string;
  /** Name of the language written in English, used for aria-labels etc. */
  englishName: string;
  /** BCP 47 tag for <html lang> and hreflang. */
  htmlLang: string;
  /** Open Graph locale tag (xx_XX). */
  ogLocale: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { nativeName: 'English', englishName: 'English', htmlLang: 'en-GB', ogLocale: 'en_GB' },
  zh: { nativeName: '中文', englishName: 'Chinese', htmlLang: 'zh-CN', ogLocale: 'zh_CN' },
  es: { nativeName: 'Español', englishName: 'Spanish', htmlLang: 'es-ES', ogLocale: 'es_ES' },
  ms: { nativeName: 'Bahasa Malaysia', englishName: 'Malay', htmlLang: 'ms-MY', ogLocale: 'ms_MY' },
};

/** URL path prefix for a locale. The default locale is unprefixed. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
