import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { Star } from '@/components/Star';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.reportThanks');
  return { title: t('title'), robots: { index: false } };
}

export default async function ReportThanksPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ hidden?: string }> }) {
  await pageLocale(params);
  const { hidden } = await searchParams;
  const t = await getTranslations('forms.reportThanks');
  return (
    <div className="container-page max-w-2xl py-10">
      <Star className="h-10 w-10 text-accent" />
      <h1 className="mt-4 text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-4 text-lg" role="status">
        {hidden === '1' ? t('hidden') : t('received')}
      </p>
      <p className="mt-4">{t('next')}</p>
      <p className="mt-4 font-semibold">
        {t('emergency')}{' '}
        <a href="tel:112" className="link">
          112
        </a>
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        {t('back')}
      </Link>
    </div>
  );
}
