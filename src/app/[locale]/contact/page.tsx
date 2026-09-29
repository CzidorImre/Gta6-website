/*
 * DRAFT, PENDING LEGAL REVIEW (the contact copy lives in messages/*.json under "contact").
 * See LEGAL_REVIEW.md.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { CONTACT_EMAIL } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact');
  return { title: t('title') };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  await pageLocale(params);
  const t = await getTranslations('contact');
  return (
    <div className="container-page max-w-prose py-10">
      <h1 className="text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-4 text-lg">{t('lead')}</p>
      <p className="mt-4">
        <a href={`mailto:${CONTACT_EMAIL}`} className="link text-xl font-bold">
          {CONTACT_EMAIL}
        </a>
      </p>
      <section className="mt-8 flex flex-col gap-4">
        <div className="card p-5">
          <h2 className="text-xl font-extrabold">{t('emergencyTitle')}</h2>
          <p className="mt-2">
            {t('emergencyBody')}{' '}
            <a href="tel:112" className="link font-bold">
              112
            </a>
          </p>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-extrabold">{t('safetyTitle')}</h2>
          <p className="mt-2">{t('safetyBody')}</p>
          <Link href="/rules" className="link mt-2 inline-block">
            {t('rulesLink')}
          </Link>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-extrabold">{t('organizersTitle')}</h2>
          <p className="mt-2">{t('organizersBody')}</p>
          <Link href="/organizer" className="link mt-2 inline-block">
            {t('organizersLink')}
          </Link>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-extrabold">{t('authoritiesTitle')}</h2>
          <p className="mt-2">{t('authoritiesBody')}</p>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-extrabold">{t('privacyTitle')}</h2>
          <p className="mt-2">{t('privacyBody')}</p>
        </div>
      </section>
      <p className="mt-8 text-sm text-muted">{t('nonAffiliation')}</p>
    </div>
  );
}
