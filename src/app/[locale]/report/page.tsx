import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { pageLocale } from '@/i18n/page-locale';
import { requireViewer } from '@/lib/auth';
import { turnstileSiteKey } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { ReportForm } from './ReportForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.report');
  return { title: t('title'), robots: { index: false } };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  await pageLocale(params);
  const { type, id } = await searchParams;
  if ((type !== 'event' && type !== 'group_post') || !id || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireViewer(`/report?type=${type}&id=${id}`);
  const t = await getTranslations('forms.report');
  const supabase = await createClient();

  // Only things the reporter can see (RLS) can be reported.
  let summary: string | null = null;
  if (type === 'event') {
    const { data } = await supabase.from('events').select('title').eq('id', id).maybeSingle();
    summary = data?.title ?? null;
  } else {
    const { data } = await supabase.from('group_posts').select('display_name, note').eq('id', id).maybeSingle();
    summary = data ? `${data.display_name}: “${data.note}”` : null;
  }
  if (!summary) notFound();

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-4xl font-extrabold">{type === 'event' ? t('titleEvent') : t('titlePost')}</h1>
      <p className="mt-3 rounded-xl bg-raised p-3 font-semibold">{summary}</p>
      <p className="mt-4 text-muted">{t('lead')}</p>
      <p className="mt-2 font-semibold">
        {t('emergency')}{' '}
        <a href="tel:112" className="link">
          112
        </a>
      </p>
      <div className="card mt-6 p-5">
        <ReportForm targetType={type} targetId={id} turnstileSiteKey={turnstileSiteKey()} />
      </div>
    </div>
  );
}
