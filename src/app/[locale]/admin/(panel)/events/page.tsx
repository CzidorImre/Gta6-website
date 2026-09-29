import type { Metadata } from 'next';
import { getFormatter, getNow, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { createClient } from '@/lib/supabase/server';
import { eventAction, legalHoldAction, venueVerifiedAction } from '../../actions';
import { AdminResult, ReasonActions } from '../AdminBits';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.events');
  return { title: t('title'), robots: { index: false } };
}

export default async function AdminEventsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, tStatus, format, now] = await Promise.all([getTranslations('admin.events'), getTranslations('eventStatus'), getFormatter(), getNow()]);
  const supabase = await createClient();
  const [{ data: events }, { data: holds }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, description, status, hidden_at, hidden_reason, starts_at, ends_at, capacity, rsvp_count, min_age, platforms, organizer:organizers ( org_name ), venue:venues ( id, name, address, kind, verified_at )')
      .gt('ends_at', new Date(now.getTime() - 45 * 86400 * 1000).toISOString())
      .order('starts_at', { ascending: true }),
    supabase.from('event_legal_holds').select('event_id, reason'),
  ]);
  const held = new Map((holds ?? []).map((h) => [h.event_id, h.reason]));
  const pending = (events ?? []).filter((e) => e.status === 'pending');
  const rest = (events ?? []).filter((e) => e.status !== 'pending');

  const row = (e: NonNullable<typeof events>[number]) => (
    <li key={e.id} className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tag">{tStatus(e.status)}</span>
        {e.hidden_at ? <span className="tag text-warn">{t('hidden', { reason: e.hidden_reason ?? '' })}</span> : null}
        {held.has(e.id) ? <span className="tag text-danger">{t('legalHold')}</span> : null}
      </div>
      <h3 className="mt-2 text-xl font-extrabold">
        <Link href={`/events/${e.id}`} className="underline-offset-4 hover:underline">
          {e.title}
        </Link>
      </h3>
      <p className="text-muted">
        {e.organizer?.org_name} · {format.dateTimeRange(new Date(e.starts_at), new Date(e.ends_at), { dateStyle: 'medium', timeStyle: 'short' })} · {e.min_age}+ ·{' '}
        {t('going', { going: e.rsvp_count, capacity: e.capacity })}
      </p>
      <p className="text-muted">
        {e.venue?.name}, {e.venue?.address} {e.venue?.verified_at ? `· ${t('verified')}` : `· ${t('notVerified')}`}
      </p>
      {e.description ? <p className="mt-2 line-clamp-4 whitespace-pre-line">{e.description}</p> : null}
      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold">{t('actions')}</summary>
        <div className="mt-3 flex flex-col gap-6">
          <ReasonActions
            action={eventAction}
            hidden={{ id: e.id }}
            reasonId={`reason-${e.id}`}
            buttons={[
              ...(e.status === 'pending' || e.status === 'rejected' ? [{ name: 'action', value: 'publish', label: t('publish'), variant: 'primary' as const }] : []),
              ...(e.status === 'pending' ? [{ name: 'action', value: 'reject', label: t('reject') }] : []),
              ...(e.hidden_at ? [{ name: 'action', value: 'restore', label: t('restore') }] : [{ name: 'action', value: 'hide', label: t('hide') }]),
              ...(e.status !== 'removed' ? [{ name: 'action', value: 'remove', label: t('remove'), variant: 'danger' as const }] : []),
            ]}
          />
          <ReasonActions
            action={legalHoldAction}
            hidden={{ id: e.id, hold: held.has(e.id) ? 'off' : 'on' }}
            reasonId={`hold-${e.id}`}
            buttons={[{ name: 'confirm', value: '1', label: held.has(e.id) ? t('releaseHold') : t('setHold') }]}
          />
          {e.venue ? (
            <ReasonActions
              action={venueVerifiedAction}
              hidden={{ venueId: e.venue.id, verified: e.venue.verified_at ? 'off' : 'on' }}
              reasonId={`venue-${e.id}`}
              buttons={[{ name: 'confirm', value: '1', label: e.venue.verified_at ? t('unverifyVenue') : t('verifyVenue') }]}
            />
          ) : null}
        </div>
      </details>
    </li>
  );

  return (
    <>
      <h1 className="text-3xl font-extrabold">{t('title')}</h1>
      <div className="mt-4">
        <AdminResult done={query.done} error={query.error} />
      </div>
      <section aria-labelledby="pending-heading" className="mt-6">
        <h2 id="pending-heading" className="text-2xl font-extrabold">
          {t('pendingHeading', { count: pending.length })}
        </h2>
        {pending.length === 0 ? <p className="mt-2 text-muted">{t('noPending')}</p> : <ul className="mt-4 flex flex-col gap-4">{pending.map(row)}</ul>}
      </section>
      <section aria-labelledby="all-heading" className="mt-10">
        <h2 id="all-heading" className="text-2xl font-extrabold">
          {t('allHeading')}
        </h2>
        <ul className="mt-4 flex flex-col gap-4">{rest.map(row)}</ul>
      </section>
    </>
  );
}
