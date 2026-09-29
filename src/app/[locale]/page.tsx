import { getNow, getTranslations } from 'next-intl/server';
import { getAppFormatter } from '@/i18n/format';
import { localePrefix, pageLocale } from '@/i18n/page-locale';
import { Link } from '@/i18n/navigation';
import { Countdown } from '@/components/Countdown';
import { EventCard } from '@/components/EventCard';
import { EventMapLoader } from '@/components/EventMapLoader';
import type { MapEvent } from '@/components/EventMap';
import { Notice } from '@/components/Notice';
import { SafetyStrip } from '@/components/SafetyStrip';
import { Star } from '@/components/Star';
import { LAUNCH_AT } from '@/lib/constants';
import { listUpcomingEvents } from '@/lib/data/events';
import { mapTilerKey } from '@/lib/env';
import { MAP_ATTRIBUTION, tileUrlFor } from '@/lib/map';
import { applyFilters, eventDates, type EventFilters, filtersToQuery, parseFilters } from '@/lib/filters';
import { spotsLeft, spotsLevel } from '@/lib/spots';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await pageLocale(params);
  const query = await searchParams;
  const filters = parseFilters(query);
  const [t, tEvent, tCountdown, format, now] = await Promise.all([
    getTranslations('home'),
    getTranslations('event'),
    getTranslations('countdown'),
    getAppFormatter(),
    getNow(),
  ]);

  const allEvents = await listUpcomingEvents();
  const dates = eventDates(allEvents);
  const events = applyFilters(allEvents, filters);

  const mapEvents: MapEvent[] = events.flatMap((e) =>
    e.venue
      ? [
          {
            id: e.id,
            title: e.title,
            lat: e.venue.lat,
            lng: e.venue.lng,
            spotsLeft: spotsLeft(e.capacity, e.rsvpCount),
            level: spotsLevel(e.capacity, e.rsvpCount),
            when: format.dateTime(new Date(e.startsAt), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            venue: e.venue.name,
            spotsLabel: tEvent('spotsLeft', { count: spotsLeft(e.capacity, e.rsvpCount) }),
            href: `${localePrefix(locale)}/events/${e.id}`,
          },
        ]
      : [],
  );

  const withFilters = (patch: Partial<EventFilters>) => ({ pathname: '/' as const, query: filtersToQuery({ ...filters, ...patch }) });

  return (
    <>
      <section className="container-page grid gap-4 pt-4 pb-1 md:grid-cols-[1.3fr_1fr] md:items-end md:gap-8 md:py-12">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-accent sm:text-base">
            <Star className="h-5 w-5" />
            {t('kicker')}
          </p>
          <h1 className="text-[1.75rem] font-extrabold sm:text-5xl">{t('headline')}</h1>
          <p className="mt-2 max-w-prose text-muted sm:mt-3 sm:text-lg">{t('lead')}</p>
        </div>
        <Countdown
          target={LAUNCH_AT}
          serverNow={now.getTime()}
          labels={{
            title: tCountdown('title'),
            days: tCountdown('days'),
            hours: tCountdown('hours'),
            minutes: tCountdown('minutes'),
            seconds: tCountdown('seconds'),
            launched: tCountdown('launched'),
          }}
        />
        {query.deleted === '1' ? (
          <div className="md:col-span-2">
            <Notice variant="success">{t('deleted')}</Notice>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="events-heading" className="container-page mt-6 md:mt-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="events-heading" className="text-2xl font-extrabold sm:text-3xl">
            {t('eventsHeading')}
          </h2>
          <nav aria-label={t('viewLabel')} className="flex rounded-full border border-input p-1">
            {(['map', 'list'] as const).map((view) => (
              <Link
                key={view}
                href={withFilters({ view })}
                aria-current={filters.view === view ? 'page' : undefined}
                className={`inline-flex min-h-11 min-w-20 items-center justify-center rounded-full px-4 font-bold ${
                  filters.view === view ? 'bg-accent text-accent-ink' : ''
                }`}
              >
                {view === 'map' ? t('viewMap') : t('viewList')}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-4 flex flex-col gap-2" role="group" aria-label={t('filtersLabel')}>
          <FilterRow label={t('filterDate')}>
            <FilterChip href={withFilters({ date: null })} active={filters.date === null} label={t('allDates')} />
            {dates.map((d) => (
              <FilterChip
                key={d}
                href={withFilters({ date: filters.date === d ? null : d })}
                active={filters.date === d}
                label={format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: 'short', day: 'numeric', month: 'short' })}
              />
            ))}
          </FilterRow>
          <FilterRow label={t('filterPlatform')}>
            <FilterChip href={withFilters({ platform: null })} active={filters.platform === null} label={t('allPlatforms')} />
            <FilterChip href={withFilters({ platform: filters.platform === 'ps5' ? null : 'ps5' })} active={filters.platform === 'ps5'} label="PS5" />
            <FilterChip href={withFilters({ platform: filters.platform === 'xbox' ? null : 'xbox' })} active={filters.platform === 'xbox'} label="Xbox" />
            <FilterChip href={withFilters({ spots: !filters.spots })} active={filters.spots} label={t('spotsOnly')} />
          </FilterRow>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold" role="status">
            {t('resultCount', { count: events.length })}
          </p>
          <Link href="/rules" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline">
            <Star className="h-4 w-4" />
            {t('safetyShort')}
          </Link>
        </div>

        {filters.view === 'map' ? (
          <div className="mt-3">
            <Link href={withFilters({ view: 'list' })} className="sr-only-focusable btn btn-secondary mb-3">
              {t('skipMap')}
            </Link>
            <EventMapLoader
              events={mapEvents}
              tileUrl={tileUrlFor(mapTilerKey())}
              attribution={MAP_ATTRIBUTION}
              labels={{ region: t('mapLabel'), viewEvent: t('viewEvent'), full: tEvent('fullShort'), noTiles: t('noTiles') }}
            />
          </div>
        ) : null}

        {events.length === 0 ? (
          <div className="card mt-6 p-6">
            <p className="font-semibold">{allEvents.length === 0 ? t('emptyAll') : t('emptyFiltered')}</p>
            <p className="mt-2 text-muted">
              {t('emptyHost')}{' '}
              <Link href="/organizer" className="link">
                {t('emptyHostLink')}
              </Link>
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="container-page mt-10">
        <SafetyStrip />
      </div>
    </>
  );
}

/** One line per filter group; scrolls sideways on narrow screens instead of wrapping. */
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      <span className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </div>
  );
}

function FilterChip({ href, active, label }: { href: { pathname: '/'; query: Record<string, string> }; active: boolean; label: string }) {
  return (
    <Link href={href} className="chip shrink-0 whitespace-nowrap" aria-current={active ? 'true' : undefined} scroll={false}>
      {label}
    </Link>
  );
}
