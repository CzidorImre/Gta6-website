import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getViewer } from '@/lib/auth';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';

export async function Header() {
  const t = await getTranslations('nav');
  const viewer = await getViewer();
  return (
    <header className="border-b border-line">
      <div className="container-page flex min-h-16 items-center justify-between gap-3 py-2">
        <Link href="/" className="rounded-lg no-underline" aria-label={t('home')}>
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/organizer" className="hidden min-h-11 items-center px-2 font-semibold underline-offset-4 hover:underline sm:inline-flex">
            {t('host')}
          </Link>
          {viewer?.profile.role === 'admin' ? (
            <Link href="/admin" className="hidden min-h-11 items-center px-2 font-semibold underline-offset-4 hover:underline sm:inline-flex">
              {t('admin')}
            </Link>
          ) : null}
          <LanguageSwitch />
          {viewer ? (
            <Link href="/account" className="btn btn-secondary min-h-11 px-4 py-2 text-sm">
              {t('account')}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary min-h-11 px-4 py-2 text-sm">
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
