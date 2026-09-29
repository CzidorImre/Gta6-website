import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { type Locale, routing } from './routing';

/** Validates the [locale] segment and enables static-safe locale lookups for this render. */
export async function pageLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}

/** URL prefix for a locale ("/en" or "/nl"). */
export function localePrefix(locale: Locale): string {
  return locale === 'nl-BE' ? '/nl' : '/en';
}
