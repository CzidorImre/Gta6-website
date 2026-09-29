import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { getViewer } from '@/lib/auth';
import { MIN_SIGNUP_AGE } from '@/lib/constants';
import { turnstileSiteKey } from '@/lib/env';
import { safeNextPath } from '@/lib/redirect';
import { brusselsToday } from '@/lib/time';
import { SignupForm } from '../AuthForms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.signup');
  return { title: t('title') };
}

export default async function SignupPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const locale = await pageLocale(params);
  const { next } = await searchParams;
  if (await getViewer()) redirect({ href: '/account', locale });
  const t = await getTranslations('forms.signup');
  const today = brusselsToday();
  const maxDate = `${Number(today.slice(0, 4)) - MIN_SIGNUP_AGE}${today.slice(4)}`;
  return (
    <div className="container-page max-w-xl py-10">
      <h1 className="text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-3 text-muted">{t('lead')}</p>
      <div className="card mt-6 p-5">
        <SignupForm next={safeNextPath(next, '/account')} turnstileSiteKey={turnstileSiteKey()} maxDate={maxDate} />
      </div>
      <p className="mt-6">
        {t('haveAccount')}{' '}
        <Link href={{ pathname: '/login', query: next ? { next } : {} }} className="link">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  );
}
