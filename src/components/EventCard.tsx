import { getTranslations } from 'next-intl/server';
import { getAppFormatter } from '@/i18n/format';
import { Link } from '@/i18n/navigation';
import type { EventSummary } from '@/lib/data/events';
import { AgeTag, PlatformTags, SpotsPill, VerifiedBadge } from './EventBits';

export async function EventCard({ event, headingLevel = 'h3' }: { event: EventSummary; headingLevel?: 'h2' | 'h3' }) {
  const format = await getAppFormatter();
  const t = await getTranslations('venueKinds');
  const Heading = headingLevel;
  const when = format.dateTimeRange(new Date(event.startsAt), new Date(event.endsAt), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <article className="card relative flex flex-col gap-3 p-4 transition-colors focus-within:border-accent hover:bg-raised">
      <div className="flex items-start justify-between gap-2">
        <SpotsPill capacity={event.capacity} rsvpCount={event.rsvpCount} />
        <AgeTag minAge={event.minAge} />
      </div>
      <Heading className="text-xl font-extrabold">
        <Link href={`/events/${event.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
          {event.title}
        </Link>
      </Heading>
      <p className="font-semibold">{when}</p>
      {event.venue ? (
        <p className="flex flex-wrap items-center gap-x-2 text-muted">
          <span>{event.venue.name}</span>
          <span aria-hidden="true">·</span>
          <span>{t(event.venue.kind)}</span>
          {event.venue.verified ? <VerifiedBadge /> : null}
        </p>
      ) : null}
      <PlatformTags platforms={event.platforms} />
    </article>
  );
}
