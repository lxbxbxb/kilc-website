import type { Locale } from './locales';

/**
 * Canonical page registry: one id per logical page, mapped to whichever
 * locales it has actually been translated into. A locale missing from a
 * page's entry means that page doesn't exist in that language yet — callers
 * fall back to the English path rather than link to a 404.
 *
 * Adding a new market or language is meant to be additive here: add the path
 * once a translated page exists, nothing else needs to change.
 */
export const PAGES = {
  home: { en: '/', zh: '/zh', es: '/es', ms: '/ms' },
  about: { en: '/about', zh: '/zh/about' },
  people: { en: '/people', zh: '/zh/people' },
  services: { en: '/services', zh: '/zh/services' },
  globalMarket: { en: '/global-market-navigation', zh: '/zh/global-market-strategy' },
  immigration: { en: '/immigration', zh: '/zh/immigration-advisory' },
  criminal: { en: '/criminal', zh: '/zh/criminal-defence' },
  studentServices: { en: '/student-services', zh: '/zh/student-services' },
  estateInvestment: { en: '/estate-investment', zh: '/zh/real-estate-investment-protection' },
  companyFormation: { en: '/company-formation', zh: '/zh/company-formation' },
  xos: { en: '/xos', zh: '/zh/xos' },
  programme: { en: '/programme', zh: '/zh/programme' },
  careers: { en: '/careers', zh: '/zh/careers' },
  internship: { en: '/internship' },
  blog: { en: '/blogs', zh: '/zh/blogs' },
  contact: { en: '/contact', zh: '/zh/contact-us' },
  fees: { en: '/fees', zh: '/zh/fees' },
  privacyPolicy: { en: '/privacy-policy', zh: '/zh/privacy-policy' },
  cookiePolicy: { en: '/cookie-policy', zh: '/zh/cookie-policy' },
  amlPolicy: { en: '/aml-policy', zh: '/zh/aml-policy' },
  ctfPolicy: { en: '/counter-terrorism-financing', zh: '/zh/counter-terrorism-financing' },

  // "Where are you investing from?" market guides
  markets: { en: '/markets', zh: '/zh/markets' },
  marketChina: { en: '/markets/china', zh: '/zh/markets/china' },
  marketArgentina: { en: '/markets/argentina', es: '/es/markets/argentina' },
  marketMalaysia: { en: '/markets/malaysia', ms: '/ms/markets/malaysia' },
} as const satisfies Record<string, Partial<Record<Locale, string>>>;

export type PageId = keyof typeof PAGES;

/** Resolve a page id to its path in `locale`, falling back to English. */
export function pagePath(id: PageId, locale: Locale): string {
  const entry = PAGES[id] as Partial<Record<Locale, string>>;
  return entry[locale] ?? entry.en ?? '/';
}

/** True when `id` has an actual translation for `locale` (not an EN fallback). */
export function hasTranslation(id: PageId, locale: Locale): boolean {
  return Boolean((PAGES[id] as Partial<Record<Locale, string>>)[locale]);
}

let reverseLookup: Map<string, PageId> | null = null;

function getReverseLookup(): Map<string, PageId> {
  if (!reverseLookup) {
    reverseLookup = new Map();
    for (const id of Object.keys(PAGES) as PageId[]) {
      for (const path of Object.values(PAGES[id] as Partial<Record<Locale, string>>)) {
        reverseLookup.set(path, id);
      }
    }
  }
  return reverseLookup;
}

/** Which page id a given URL path belongs to, if any. */
export function pageIdForPath(pathname: string): PageId | undefined {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return getReverseLookup().get(normalized);
}
