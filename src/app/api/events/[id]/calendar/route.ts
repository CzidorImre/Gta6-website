import type { NextRequest } from 'next/server';
import { getEvent } from '@/lib/data/events';
import { siteUrl } from '@/lib/env';
import { buildIcs } from '@/lib/ics';

/** Add-to-calendar file for one visible event. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event || !event.venue) return new Response('Not found', { status: 404 });

  const prefix = request.nextUrl.searchParams.get('locale') === 'nl-BE' ? '/nl' : '/en';
  const url = `${siteUrl()}${prefix}/events/${event.id}`;
  const ics = buildIcs({
    uid: `${event.id}@wantedlevel.be`,
    title: event.title,
    description: `${event.description}\n\n${url}`.trim(),
    location: `${event.venue.name}, ${event.venue.address}`,
    start: new Date(event.startsAt),
    end: new Date(event.endsAt),
    url,
  });
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="wanted-level-${event.id.slice(0, 8)}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
