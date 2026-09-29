'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/** Manual language switch. Keeps you on the same page; the language lives in the URL. */
export function LanguageSwitch() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t('language')} className="flex rounded-full border border-input p-0.5">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? 'true' : undefined}
          className={`inline-flex min-h-10 min-w-11 items-center justify-center rounded-full px-2 text-sm font-bold ${
            l === locale ? 'bg-selected text-text' : 'text-muted hover:text-text'
          }`}
        >
          <span aria-hidden="true">{l === 'en' ? 'EN' : 'NL'}</span>
          <span className="sr-only">{l === 'en' ? 'English' : 'Nederlands'}</span>
        </Link>
      ))}
    </nav>
  );
}
