import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { requireViewer } from '@/lib/auth';
import { turnstileSiteKey } from '@/lib/env';
import { ApplicationForm } from '../ApplicationForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.apply');
  return { title: t('title') };
}

export default async function ApplyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await pageLocale(params);
  const viewer = await requireViewer('/organizer/apply');
  if (viewer.isOrganizer) redirect({ href: '/organizer', locale });
  const t = await getTranslations('forms.apply');
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-3 text-muted">{t('lead')}</p>
      <ul className="mt-4 list-disc space-y-1 pl-5">
        <li>{t('ruleVenue')}</li>
        <li>{t('ruleReview')}</li>
        <li>{t('ruleFree')}</li>
      </ul>
      <div className="card mt-6 p-5">
        <ApplicationForm turnstileSiteKey={turnstileSiteKey()} />
      </div>
    </div>
  );
}
