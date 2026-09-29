import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CONTACT_EMAIL } from '@/lib/constants';
import { LogoMark } from './Logo';

export async function Footer() {
  const t = await getTranslations('footer');
  const links = [
    { href: '/rules', label: t('rules') },
    { href: '/organizer', label: t('host') },
    { href: '/privacy', label: t('privacy') },
    { href: '/terms', label: t('terms') },
    { href: '/contact', label: t('contact') },
  ] as const;
  return (
    <footer className="mt-16 border-t border-line">
      <div className="container-page flex flex-col gap-6 py-10">
        <nav aria-label={t('label')}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="font-semibold">
          {t('emergency')}{' '}
          <a href="tel:112" className="link">
            112
          </a>
        </p>
        <div className="flex items-start gap-3 text-sm text-muted">
          <LogoMark className="h-7 w-6 shrink-0 opacity-80" />
          <div className="space-y-2">
            <p>{t('about')}</p>
            <p>{t('nonAffiliation')}</p>
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
