import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageLocale } from '@/i18n/page-locale';
import { SubmitButton } from '@/components/SubmitButton';
import { confirmAction } from '../../actions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.confirm');
  return { title: t('title'), robots: { index: false } };
}

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  await pageLocale(params);
  const { token_hash, type, next } = await searchParams;
  const t = await getTranslations('forms.confirm');
  return (
    <div className="container-page max-w-xl py-10">
      <h1 className="text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-3 text-muted">{t('lead')}</p>
      <form action={confirmAction} className="mt-6">
        <input type="hidden" name="token_hash" value={token_hash ?? ''} />
        <input type="hidden" name="type" value={type ?? 'email'} />
        <input type="hidden" name="next" value={next ?? ''} />
        <SubmitButton pendingLabel={t('working')} className="w-full sm:w-auto">
          {t('button')}
        </SubmitButton>
      </form>
    </div>
  );
}
