import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getAppFormatter } from '@/i18n/format';
import { pageLocale } from '@/i18n/page-locale';
import { createClient } from '@/lib/supabase/server';
import { reviewApplicationAction } from '../../actions';
import { AdminResult, ReasonActions } from '../AdminBits';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.applications');
  return { title: t('title'), robots: { index: false } };
}

export default async function ApplicationsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, tKinds, format] = await Promise.all([getTranslations('admin.applications'), getTranslations('venueKinds'), getAppFormatter()]);
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from('organizer_applications')
    .select('id, org_name, social_url, venue_name, venue_address, venue_kind, message, created_at, applicant:profiles!organizer_applications_user_id_fkey ( display_name )')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return (
    <>
      <h1 className="text-3xl font-extrabold">{t('title')}</h1>
      <div className="mt-4">
        <AdminResult done={query.done} error={query.error} />
      </div>
      {(applications ?? []).length === 0 ? (
        <p className="mt-6 text-muted">{t('empty')}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {(applications ?? []).map((a) => (
            <li key={a.id} className="card p-5">
              <h2 className="text-xl font-extrabold">{a.org_name}</h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-semibold text-muted">{t('applicant')}</dt>
                  <dd>{a.applicant?.display_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted">{t('social')}</dt>
                  <dd>
                    <a href={a.social_url} className="link break-all" target="_blank" rel="noopener noreferrer nofollow">
                      {a.social_url}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted">{t('venue')}</dt>
                  <dd>
                    {a.venue_name} ({tKinds(a.venue_kind)})
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted">{t('address')}</dt>
                  <dd>{a.venue_address}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-semibold text-muted">{t('message')}</dt>
                  <dd className="whitespace-pre-line">{a.message ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted">{t('submitted')}</dt>
                  <dd>{format.dateTime(new Date(a.created_at), { dateStyle: 'medium', timeStyle: 'short' })}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <ReasonActions
                  action={reviewApplicationAction}
                  hidden={{ id: a.id }}
                  reasonId={`reason-${a.id}`}
                  buttons={[
                    { name: 'decision', value: 'approve', label: t('approve'), variant: 'primary' },
                    { name: 'decision', value: 'reject', label: t('reject') },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
