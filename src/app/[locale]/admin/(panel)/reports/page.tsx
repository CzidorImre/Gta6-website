import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAppFormatter } from '@/i18n/format';
import { pageLocale } from '@/i18n/page-locale';
import { createClient } from '@/lib/supabase/server';
import { postAction, resolveReportAction } from '../../actions';
import { AdminResult, ReasonActions } from '../AdminBits';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.reports');
  return { title: t('title'), robots: { index: false } };
}

export default async function AdminReportsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, tCategories, format] = await Promise.all([getTranslations('admin.reports'), getTranslations('forms.report.categories'), getAppFormatter()]);
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from('reports')
    .select(
      'id, category, details, target_type, event_id, group_post_id, target_snapshot, created_at, reporter:profiles!reports_reporter_id_fkey ( display_name ), event:events ( title, hidden_at, status ), post:group_posts ( hidden_at )',
    )
    .eq('status', 'open')
    .order('created_at', { ascending: true });
  // Safety first, then oldest first.
  const sorted = [...(reports ?? [])].sort((a, b) => Number(b.category === 'safety') - Number(a.category === 'safety'));

  return (
    <>
      <h1 className="text-3xl font-extrabold">{t('title')}</h1>
      <p className="mt-2 text-muted">{t('lead')}</p>
      <div className="mt-4">
        <AdminResult done={query.done} error={query.error} />
      </div>
      {sorted.length === 0 ? (
        <p className="mt-6 text-muted">{t('empty')}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {sorted.map((r) => {
            const snapshot = (r.target_snapshot ?? null) as { note?: string; discord_handle?: string | null; display_name?: string } | null;
            const hidden = r.target_type === 'event' ? Boolean(r.event?.hidden_at) : Boolean(r.post?.hidden_at);
            return (
              <li key={r.id} className={`card p-5 ${r.category === 'safety' ? 'border-danger' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`tag ${r.category === 'safety' ? 'text-danger' : ''}`}>{tCategories(`${r.category}.label`)}</span>
                  <span className="tag">{r.target_type === 'event' ? t('targetEvent') : t('targetPost')}</span>
                  {hidden ? <span className="tag text-warn">{t('currentlyHidden')}</span> : null}
                </div>
                <h2 className="mt-2 text-xl font-extrabold">
                  <Link href={`/events/${r.event_id}`} className="underline-offset-4 hover:underline">
                    {r.event?.title ?? r.event_id}
                  </Link>
                </h2>
                {snapshot ? (
                  <blockquote className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
                    <p className="font-bold">{snapshot.display_name}</p>
                    <p className="whitespace-pre-line">{snapshot.note}</p>
                    {snapshot.discord_handle ? <p className="text-sm text-muted">Discord: {snapshot.discord_handle}</p> : null}
                    {!r.group_post_id ? <p className="mt-1 text-sm text-muted">{t('postGone')}</p> : null}
                  </blockquote>
                ) : null}
                <p className="mt-3">
                  <span className="font-semibold">{t('details')}:</span> {r.details ?? '—'}
                </p>
                <p className="text-sm text-muted">
                  {t('reportedBy', { name: r.reporter?.display_name ?? t('deletedUser') })} · {format.dateTime(new Date(r.created_at), { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <div className="mt-4 flex flex-col gap-6">
                  <ReasonActions
                    action={resolveReportAction}
                    hidden={{ id: r.id }}
                    reasonId={`reason-${r.id}`}
                    buttons={[
                      { name: 'outcome', value: 'remove', label: r.target_type === 'event' ? t('removeEvent') : t('removePost'), variant: 'danger' },
                      { name: 'outcome', value: 'dismiss', label: hidden ? t('dismissRestore') : t('dismiss') },
                      { name: 'outcome', value: 'resolve', label: t('resolve') },
                    ]}
                  />
                  {r.group_post_id && !hidden ? (
                    <ReasonActions
                      action={postAction}
                      hidden={{ id: r.group_post_id }}
                      reasonId={`post-${r.id}`}
                      buttons={[{ name: 'action', value: 'hide', label: t('hidePost') }]}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
