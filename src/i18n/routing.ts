import { defineRouting } from 'next-intl/routing';

/**
 * Locale lives in the URL (/en, /nl), picked from Accept-Language on first visit. No locale cookie:
 * the only cookies this site sets are the auth session.
 */
export const routing = defineRouting({
  locales: ['en', 'nl-BE'],
  defaultLocale: 'en',
  localePrefix: { mode: 'always', prefixes: { en: '/en', 'nl-BE': '/nl' } },
  localeCookie: false,
  alternateLinks: true,
});

export type Locale = (typeof routing.locales)[number];
