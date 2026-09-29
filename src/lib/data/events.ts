import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type Enums = Database['public']['Enums'];

export interface EventVenue {
  id: string;
  name: string;
  address: string;
  kind: Enums['venue_kind'];
  lat: number;
  lng: number;
  verified: boolean;
}

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  platforms: Enums['platform'][];
  consoleCount: number;
  capacity: number;
  rsvpCount: number;
  minAge: number;
  status: Enums['event_status'];
  hidden: boolean;
  cancelled: boolean;
  publishedBefore: boolean;
  organizerId: string;
  organizerName: string | null;
  organizerUrl: string | null;
  venue: EventVenue | null;
}

const EVENT_COLUMNS = `
  id, title, description, starts_at, ends_at, platforms, console_count, capacity, rsvp_count, min_age,
  status, hidden_at, cancelled_at, published_at, organizer_id,
  venue:venues ( id, name, address, kind, lat, lng, verified_at ),
  organizer:organizers ( org_name, social_url )
` as const;

type EventRow = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  platforms: Enums['platform'][];
  console_count: number;
  capacity: number;
  rsvp_count: number;
  min_age: number;
  status: Enums['event_status'];
  hidden_at: string | null;
  cancelled_at: string | null;
  published_at: string | null;
  organizer_id: string;
  venue: { id: string; name: string; address: string; kind: Enums['venue_kind']; lat: number; lng: number; verified_at: string | null } | null;
  organizer: { org_name: string; social_url: string | null } | null;
};

function toSummary(row: EventRow): EventSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    platforms: row.platforms,
    consoleCount: row.console_count,
    capacity: row.capacity,
    rsvpCount: row.rsvp_count,
    minAge: row.min_age,
    status: row.status,
    hidden: row.hidden_at !== null,
    cancelled: row.status === 'cancelled',
    publishedBefore: row.published_at !== null,
    organizerId: row.organizer_id,
    organizerName: row.organizer?.org_name ?? null,
    organizerUrl: row.organizer?.social_url ?? null,
    venue: row.venue
      ? {
          id: row.venue.id,
          name: row.venue.name,
          address: row.venue.address,
          kind: row.venue.kind,
          lat: row.venue.lat,
          lng: row.venue.lng,
          verified: row.venue.verified_at !== null,
        }
      : null,
  };
}

/** Published events that haven't ended, soonest first (what the map and list show). */
export async function listUpcomingEvents(): Promise<EventSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('status', 'published')
    .is('hidden_at', null)
    .gt('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(500);
  if (error) throw new Error(`Could not load events: ${error.message}`);
  return (data as unknown as EventRow[]).filter((row) => row.venue !== null).map(toSummary);
}

/** One event the visitor is allowed to see (RLS decides), or null. */
export async function getEvent(id: string): Promise<EventSummary | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('events').select(EVENT_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load event: ${error.message}`);
  return data ? toSummary(data as unknown as EventRow) : null;
}

/** Events owned by an organizer (all statuses), newest first. */
export async function listOrganizerEvents(organizerId: string): Promise<EventSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('organizer_id', organizerId)
    .order('starts_at', { ascending: false });
  if (error) throw new Error(`Could not load events: ${error.message}`);
  return (data as unknown as EventRow[]).map(toSummary);
}
