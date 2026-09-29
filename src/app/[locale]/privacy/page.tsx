import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageLocale } from '@/i18n/page-locale';
import { PrivacyContent } from '@/content/legal';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('footer');
  return { title: t('privacy') };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await pageLocale(params);
  return (
    <div className="container-page py-10">
      <PrivacyContent locale={locale} />
    </div>
  );
}
