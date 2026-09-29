import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getNow, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAppFormatter } from '@/i18n/format';
import { pageLocale } from '@/i18n/page-locale';
import { AgeTag, PlatformTags, SpotsPill, VerifiedBadge } from '@/components/EventBits';
import { Notice } from '@/components/Notice';
import { Star } from '@/components/Star';
import { SubmitButton } from '@/components/SubmitButton';
import { getViewer, type Viewer } from '@/lib/auth';
import { ageOn } from '@/lib/age';
import { RULES_VERSION } from '@/lib/constants';
import { type EventSummary, getEvent } from '@/lib/data/events';
import { type ErrorCode, KNOWN_ERROR_CODES } from '@/lib/errors';
import { spotsLeft } from '@/lib/spots';
import { createClient } from '@/lib/supabase/server';
import { brusselsDateKey } from '@/lib/time';
import { cancelRsvpAction, deletePostAction, rsvpAction, savePostAction } from './actions';

type Params = Promise<{ locale: string; id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  await pageLocale(params);
  const event = await getEvent(id);
  if (!event) return {};
  return { title: event.title, description: event.description.slice(0, 160) || undefined };
}

interface BoardPost {
  id: string;
  user_id: string;
  display_name: string;
  note: string;
  discord_handle: string | null;
  hidden_at: string | null;
}

export default async function EventPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const query = await searchParams;
  const event = await getEvent(id);
  if (!event || !event.venue) notFound();

  const [t, format, viewer] = await Promise.all([getTranslations('eventPage'), getAppFormatter(), getViewer()]);
  const tKinds = await getTranslations('venueKinds');
  const supabase = await createClient();

  let going = false;
  let posts: BoardPost[] = [];
  if (viewer) {
    const { data: rsvp } = await supabase
      .from('rsvps')
      .select('event_id')
      .eq('event_id', event.id)
      .eq('user_id', viewer.userId)
      .maybeSingle();
    going = Boolean(rsvp);
    if (going || viewer.aal === 'aal2') {
      const { data } = await supabase
        .from('group_posts')
        .select('id, user_id, display_name, note, discord_handle, hidden_at')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });
      posts = data ?? [];
    }
  }

  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const venue = event.venue;
  const isOwner = viewer?.userId === event.organizerId;
  const errorCode = typeof query.error === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(query.error) ? (query.error as ErrorCode) : null;

  return (
    <div className="container-page py-5">
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline">
        ← {t('back')}
      </Link>

      {event.cancelled || event.hidden || event.status !== 'published' ? (
        <div className="mt-3 flex flex-col gap-3">
          {event.cancelled ? <Notice variant="warning">{t('cancelled')}</Notice> : null}
          {event.hidden && (isOwner || viewer?.aal === 'aal2') ? <Notice variant="warning">{t('hiddenNotice')}</Notice> : null}
          {event.status === 'pending' ? <Notice variant="info">{event.publishedBefore ? t('reReview') : t('pendingNotice')}</Notice> : null}
          {event.status === 'rejected' || event.status === 'removed' ? <Notice variant="error">{t('notPublic')}</Notice> : null}
        </div>
      ) : null}

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <SpotsPill capacity={event.capacity} rsvpCount={event.rsvpCount} />
          <AgeTag minAge={event.minAge} />
        </div>
        <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{event.title}</h1>
        {event.organizerName ? (
          <p className="mt-3 text-lg text-muted">
            {t('hostedBy')}{' '}
            {event.organizerUrl ? (
              <a href={event.organizerUrl} className="link" target="_blank" rel="noopener noreferrer nofollow ugc">
                {event.organizerName}
              </a>
            ) : (
              <span className="font-semibold text-text">{event.organizerName}</span>
            )}
          </p>
        ) : null}
      </header>

      {/* Phones: facts, RSVP + safety, description, board. Desktop: RSVP + safety in a sidebar. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <dl className="card grid gap-5 p-5 sm:grid-cols-2 lg:col-start-1">
          <Fact label={t('when')}>
            <span className="font-semibold">
              {format.dateTimeRange(start, end, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="block text-sm text-muted">{t('timezoneNote')}</span>
          </Fact>
          <Fact label={t('where')}>
            <span className="font-semibold">{venue.name}</span>
            <span className="block">{venue.address}</span>
            <span className="block text-sm text-muted">{tKinds(venue.kind)}</span>
            {venue.verified ? (
              <span className="mt-1 block">
                <VerifiedBadge />
              </span>
            ) : null}
            <a
              className="link mt-1 flex min-h-11 items-center text-sm"
              href={`https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=18/${venue.lat}/${venue.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('openInMaps')}
            </a>
          </Fact>
          <Fact label={t('platforms')}>
            <PlatformTags platforms={event.platforms} />
          </Fact>
          <Fact label={t('consoles')}>
            <span className="font-semibold">{t('consoleCount', { count: event.consoleCount })}</span>
          </Fact>
          <Fact label={t('capacity')}>
            <span className="font-semibold">
              {t('capacityValue', { going: event.rsvpCount, capacity: event.capacity })}
            </span>
          </Fact>
          <Fact label={t('minAge')}>
            <span className="font-semibold">{t('minAgeValue', { age: event.minAge })}</span>
          </Fact>
        </dl>

        <div className="flex flex-col gap-6 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <section id="rsvp" aria-labelledby="rsvp-heading" className="card scroll-mt-4 p-5">
            <h2 id="rsvp-heading" className="text-2xl font-extrabold">
              {t('rsvpHeading')}
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              {query.rsvp === 'going' ? <Notice variant="success">{t('rsvpDone')}</Notice> : null}
              {query.rsvp === 'cancelled' ? <Notice variant="info">{t('rsvpCancelled')}</Notice> : null}
              {errorCode ? <Notice variant="error">{await errorMessage(errorCode)}</Notice> : null}
              <RsvpControls event={event} viewer={viewer} going={going} />
              <a href={`/api/events/${event.id}/calendar?locale=${locale}`} className="btn btn-secondary" download>
                {t('addToCalendar')}
              </a>
            </div>
          </section>

          <SafetyBox />

          <p>
            <Link href={{ pathname: '/report', query: { type: 'event', id: event.id } }} className="inline-flex min-h-11 items-center font-semibold text-muted underline underline-offset-4 hover:text-text">
              {t('reportEvent')}
            </Link>
          </p>
        </div>

        {event.description ? (
          <section aria-labelledby="about-heading" className="max-w-prose lg:col-start-1">
            <h2 id="about-heading" className="text-2xl font-extrabold">
              {t('about')}
            </h2>
            <p className="mt-3 whitespace-pre-line text-lg">{event.description}</p>
          </section>
        ) : null}

        <div className="lg:col-start-1">
          <GroupBoard event={event} viewer={viewer} going={going} posts={posts} status={typeof query.board === 'string' ? query.board : null} />
        </div>
      </div>
    </div>
  );
}

async function errorMessage(code: ErrorCode): Promise<string> {
  const t = await getTranslations('errors');
  return t(code);
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

async function RsvpControls({ event, viewer, going }: { event: EventSummary; viewer: Viewer | null; going: boolean }) {
  const [t, now] = await Promise.all([getTranslations('eventPage'), getNow()]);
  const bookable = event.status === 'published' && !event.hidden;
  const started = new Date(event.startsAt).getTime() <= now.getTime();

  if (!bookable) return <p className="text-muted">{t('rsvpClosed')}</p>;
  if (started) return <p className="text-muted">{t('rsvpStarted')}</p>;

  if (!viewer) {
    return (
      <div className="flex flex-col gap-3">
        <p>{t('loginToRsvp')}</p>
        <Link href={{ pathname: '/login', query: { next: `/events/${event.id}` } }} className="btn btn-primary">
          {t('loginButton')}
        </Link>
        <Link href={{ pathname: '/signup', query: { next: `/events/${event.id}` } }} className="btn btn-secondary">
          {t('signupButton')}
        </Link>
      </div>
    );
  }

  if (going) {
    return (
      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-2 text-lg font-bold text-accent">
          <Star className="h-5 w-5" />
          {t('youreGoing')}
        </p>
        <form action={cancelRsvpAction}>
          <input type="hidden" name="eventId" value={event.id} />
          <SubmitButton variant="secondary" pendingLabel={t('working')} className="w-full">
            {t('cancelRsvp')}
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (viewer.profile.banned_at) return <Notice variant="warning">{t('banned')}</Notice>;

  const age = ageOn(viewer.profile.date_of_birth, brusselsDateKey(new Date(event.startsAt)));
  if (age < event.minAge) return <Notice variant="warning">{t('tooYoung', { age: event.minAge })}</Notice>;

  if (spotsLeft(event.capacity, event.rsvpCount) === 0) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-primary" disabled aria-disabled="true">
          {t('full')}
        </button>
        <p className="text-sm text-muted">{t('fullHint')}</p>
      </div>
    );
  }

  const needsRules = !viewer.profile.rules_accepted_at || viewer.profile.rules_version !== RULES_VERSION;
  if (needsRules) {
    return (
      <div className="flex flex-col gap-2">
        <Link href={{ pathname: '/rules', query: { rsvp: event.id } }} className="btn btn-primary">
          {t('rsvpButton')}
        </Link>
        <p className="text-sm text-muted">{t('rulesFirst')}</p>
      </div>
    );
  }

  return (
    <form action={rsvpAction}>
      <input type="hidden" name="eventId" value={event.id} />
      <SubmitButton pendingLabel={t('working')} className="w-full">
        {t('rsvpButton')}
      </SubmitButton>
    </form>
  );
}

async function SafetyBox() {
  const t = await getTranslations('eventPage');
  return (
    <section aria-labelledby="safety-heading">
      <h2 id="safety-heading" className="flex items-center gap-2 text-xl font-extrabold">
        <Star className="h-5 w-5 text-accent" />
        {t('safetyHeading')}
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>{t('safetyTellFriend')}</li>
        <li>{t('safetyPublic')}</li>
        <li>{t('safetyLeave')}</li>
        <li>
          {t('safetyEmergency')}{' '}
          <a href="tel:112" className="link font-bold">
            112
          </a>
        </li>
      </ul>
      <p className="mt-3">
        <Link href="/rules" className="link">
          {t('safetyRules')}
        </Link>
      </p>
    </section>
  );
}

async function GroupBoard({
  event,
  viewer,
  going,
  posts,
  status,
}: {
  event: EventSummary;
  viewer: Viewer | null;
  going: boolean;
  posts: BoardPost[];
  status: string | null;
}) {
  const t = await getTranslations('board');
  const own = posts.find((p) => p.user_id === viewer?.userId);
  const canSee = going || viewer?.aal === 'aal2';
  const statusMessage =
    status === 'saved' ? t('saved') : status === 'deleted' ? t('deleted') : status === 'error' ? t('error') : status?.startsWith('invalid_') ? t('invalid') : null;

  return (
    <section id="board" aria-labelledby="board-heading" className="card scroll-mt-4 p-5">
      <h2 id="board-heading" className="text-2xl font-extrabold">
        {t('title')}
      </h2>
      <p className="mt-2 text-muted">{t('intro')}</p>

      {!canSee ? (
        <p className="mt-4 rounded-xl border border-line bg-raised p-4">{t('locked')}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {statusMessage ? <Notice variant={status === 'saved' || status === 'deleted' ? 'success' : 'error'}>{statusMessage}</Notice> : null}
          {posts.length === 0 ? (
            <p>{t('empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {posts.map((post) => (
                <li key={post.id} className="rounded-xl border border-line bg-raised p-4">
                  <p className="font-bold">
                    {post.display_name}
                    {post.user_id === viewer?.userId ? <span className="ml-2 text-sm font-semibold text-muted">({t('you')})</span> : null}
                  </p>
                  {post.hidden_at ? <p className="mt-1 text-sm font-semibold text-warn">{t('hidden')}</p> : null}
                  <p className="mt-1 whitespace-pre-line">{post.note}</p>
                  {post.discord_handle ? (
                    <p className="mt-2 text-sm">
                      <span className="text-muted">{t('discord')}:</span> <span className="font-semibold">{post.discord_handle}</span>
                    </p>
                  ) : null}
                  {post.user_id !== viewer?.userId ? (
                    <Link
                      href={{ pathname: '/report', query: { type: 'group_post', id: post.id } }}
                      className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-muted underline underline-offset-4 hover:text-text"
                    >
                      {t('report')}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {going && event.status === 'published' && !event.hidden && (!own || !own.hidden_at) ? (
            <form action={savePostAction} className="flex flex-col gap-3 rounded-xl border border-line p-4">
              <input type="hidden" name="eventId" value={event.id} />
              <h3 className="text-lg font-extrabold">{own ? t('editHeading') : t('postHeading')}</h3>
              <div>
                <label htmlFor="note" className="field-label">
                  {t('note')}
                </label>
                <textarea id="note" name="note" required maxLength={280} rows={3} className="input" defaultValue={own?.note ?? ''} aria-describedby="note-hint" />
                <span id="note-hint" className="field-hint">
                  {t('noteHint')}
                </span>
              </div>
              <div>
                <label htmlFor="discordHandle" className="field-label">
                  {t('discordLabel')}
                </label>
                <input
                  id="discordHandle"
                  name="discordHandle"
                  maxLength={37}
                  className="input"
                  defaultValue={own?.discord_handle ?? ''}
                  autoComplete="off"
                  aria-describedby="discord-hint"
                />
                <span id="discord-hint" className="field-hint">
                  {t('discordHint')}
                </span>
              </div>
              <SubmitButton pendingLabel={t('saving')}>{own ? t('update') : t('post')}</SubmitButton>
            </form>
          ) : null}
          {own ? (
            <form action={deletePostAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <SubmitButton variant="secondary" pendingLabel={t('saving')}>
                {t('delete')}
              </SubmitButton>
            </form>
          ) : null}
        </div>
      )}
    </section>
  );
}
