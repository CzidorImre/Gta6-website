import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { Notice } from '@/components/Notice';
import { getViewer } from '@/lib/auth';
import { turnstileSiteKey } from '@/lib/env';
import { safeNextPath } from '@/lib/redirect';
import { LoginForm } from '../AuthForms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.login');
  return { title: t('title') };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const locale = await pageLocale(params);
  const { next, error } = await searchParams;
  if (await getViewer()) redirect({ href: safeNextPath(next, '/account'), locale });
  const t = await getTranslations('forms.login');
  return (
    <div className="container-page max-w-xl py-10">
      <h1 className="text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-3 text-muted">{t('lead')}</p>
      {error === 'link' ? (
        <div className="mt-4">
          <Notice variant="error">{t('linkError')}</Notice>
        </div>
      ) : null}
      <div className="card mt-6 p-5">
        <LoginForm next={safeNextPath(next, '/')} turnstileSiteKey={turnstileSiteKey()} />
      </div>
      <p className="mt-6">
        {t('noAccount')}{' '}
        <Link href={{ pathname: '/signup', query: next ? { next } : {} }} className="link">
          {t('signupLink')}
        </Link>
      </p>
    </div>
  );
}
