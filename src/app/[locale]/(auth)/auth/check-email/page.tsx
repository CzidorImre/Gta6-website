import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { Star } from '@/components/Star';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.checkEmail');
  return { title: t('title'), robots: { index: false } };
}

export default async function CheckEmailPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ from?: string }> }) {
  await pageLocale(params);
  const { from } = await searchParams;
  const t = await getTranslations('forms.checkEmail');
  return (
    <div className="container-page max-w-xl py-10">
      <Star className="h-10 w-10 text-accent" />
      <h1 className="mt-4 text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-4 text-lg" role="status">
        {from === 'signup' ? t('signupBody') : t('loginBody')}
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-muted">
        <li>{t('tipSpam')}</li>
        <li>{t('tipExpiry')}</li>
        {from === 'login' ? (
          <li>
            {t('tipNoAccount')}{' '}
            <Link href="/signup" className="link">
              {t('signupLink')}
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
