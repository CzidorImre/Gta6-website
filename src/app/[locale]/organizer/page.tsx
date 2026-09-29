import type { Metadata } from 'next';
import { getFormatter, getNow, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { VerifiedBadge } from '@/components/EventBits';
import { getViewer } from '@/lib/auth';
import { listOrganizerEvents } from '@/lib/data/events';
import { type ErrorCode, KNOWN_ERROR_CODES } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { cancelEventAction } from './actions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('organizer');
  return { title: t('title') };
}

export default async function OrganizerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ applied?: string; saved?: string; cancelled?: string; error?: string }>;
}) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, tStatus, tErrors, format, viewer, now] = await Promise.all([
    getTranslations('organizer'),
    getTranslations('eventStatus'),
    getTranslations('errors'),
    getFormatter(),
    getViewer(),
    getNow(),
  ]);

  if (!viewer) {
    return (
      <div className="container-page max-w-3xl py-10">
        <h1 className="text-4xl font-extrabold">{t('pitchTitle')}</h1>
        <p className="mt-4 text-lg">{t('pitchBody')}</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-muted">
          <li>{t('pitchVenues')}</li>
          <li>{t('pitchReview')}</li>
          <li>{t('pitchFree')}</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={{ pathname: '/signup', query: { next: '/organizer/apply' } }} className="btn btn-primary">
            {t('pitchSignup')}
          </Link>
          <Link href={{ pathname: '/login', query: { next: '/organizer/apply' } }} className="btn btn-secondary">
            {t('pitchLogin')}
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const errorCode = query.error && (KNOWN_ERROR_CODES as readonly string[]).includes(query.error) ? (query.error as ErrorCode) : null;

  if (!viewer.isOrganizer) {
    const { data: applications } = await supabase
      .from('organizer_applications')
      .select('id, org_name, status, review_reason, created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    const latest = applications?.[0];
    return (
      <div className="container-page max-w-3xl py-10">
        <h1 className="text-4xl font-extrabold">{t('title')}</h1>
        <div className="mt-6 flex flex-col gap-4">
          {query.applied ? <Notice variant="success">{t('applied')}</Notice> : null}
          {latest?.status === 'pending' ? (
            <Notice variant="info">{t('applicationPending', { name: latest.org_name })}</Notice>
          ) : latest?.status === 'rejected' ? (
            <Notice variant="warning">
              {t('applicationRejected')}
              {latest.review_reason ? <span className="mt-1 block">{t('reason', { reason: latest.review_reason })}</span> : null}
            </Notice>
          ) : null}
          {latest?.status !== 'pending' ? (
            <div>
              <p className="text-lg">{t('pitchBody')}</p>
              <Link href="/organizer/apply" className="btn btn-primary mt-4">
                {t('applyButton')}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const [events, { data: venues }] = await Promise.all([
    listOrganizerEvents(viewer.userId),
    supabase.from('venues').select('id, name, address, verified_at').eq('organizer_id', viewer.userId).order('created_at'),
  ]);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold">{t('dashboardTitle')}</h1>
        <Link href="/organizer/events/new" className="btn btn-primary">
          {t('newEvent')}
        </Link>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {query.saved ? <Notice variant="success">{t('saved')}</Notice> : null}
        {query.cancelled ? <Notice variant="info">{t('cancelled')}</Notice> : null}
        {errorCode ? <Notice variant="error">{tErrors(errorCode)}</Notice> : null}
        {viewer.profile.banned_at ? <Notice variant="warning">{t('banned')}</Notice> : null}
      </div>

      <section aria-labelledby="events-heading" className="mt-8">
        <h2 id="events-heading" className="text-2xl font-extrabold">
          {t('eventsHeading')}
        </h2>
        {events.length === 0 ? (
          <p className="mt-3 text-muted">{t('noEvents')}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {events.map((e) => {
              const upcoming = new Date(e.endsAt).getTime() > now.getTime();
              return (
                <li key={e.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="tag">{tStatus(e.status)}</span>
                      {e.hidden ? <span className="tag text-warn">{t('hiddenTag')}</span> : null}
                    </p>
                    <p className="mt-2 text-lg font-bold">
                      <Link href={`/events/${e.id}`} className="underline-offset-4 hover:underline">
                        {e.title}
                      </Link>
                    </p>
                    <p className="text-muted">
                      {format.dateTime(new Date(e.startsAt), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ·{' '}
                      {t('going', { going: e.rsvpCount, capacity: e.capacity })}
                    </p>
                  </div>
                  {upcoming && ['pending', 'published', 'rejected'].includes(e.status) ? (
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/organizer/events/${e.id}/edit`} className="btn btn-secondary">
                        {t('edit')}
                      </Link>
                      {e.status !== 'rejected' ? (
                        <form action={cancelEventAction}>
                          <input type="hidden" name="eventId" value={e.id} />
                          <SubmitButton variant="secondary" pendingLabel={t('working')}>
                            {t('cancel')}
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="venues-heading" className="mt-10">
        <h2 id="venues-heading" className="text-2xl font-extrabold">
          {t('venuesHeading')}
        </h2>
        {(venues ?? []).length === 0 ? (
          <p className="mt-3 text-muted">{t('noVenues')}</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(venues ?? []).map((v) => (
              <li key={v.id} className="card p-4">
                <p className="font-bold">{v.name}</p>
                <p className="text-muted">{v.address}</p>
                {v.verified_at ? <VerifiedBadge /> : <p className="text-sm text-muted">{t('notVerified')}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
