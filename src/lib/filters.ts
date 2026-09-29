import { PLATFORMS, type Platform } from './constants';
import { spotsLeft } from './spots';
import { brusselsDateKey } from './time';

export interface EventFilters {
  view: 'map' | 'list';
  date: string | null;
  platform: Platform | null;
  spots: boolean;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseFilters(params: SearchParams): EventFilters {
  const view = first(params.view) === 'list' ? 'list' : 'map';
  const dateRaw = first(params.date);
  const date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
  const platformRaw = first(params.platform);
  const platform = (PLATFORMS as readonly string[]).includes(platformRaw ?? '') ? (platformRaw as Platform) : null;
  const spots = first(params.spots) === '1';
  return { view, date, platform, spots };
}

/** Query string for a filter state, omitting defaults, so links stay short and shareable. */
export function filtersToQuery(filters: EventFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.view === 'list') query.view = 'list';
  if (filters.date) query.date = filters.date;
  if (filters.platform) query.platform = filters.platform;
  if (filters.spots) query.spots = '1';
  return query;
}

interface FilterableEvent {
  startsAt: string;
  platforms: readonly string[];
  capacity: number;
  rsvpCount: number;
}

export function applyFilters<T extends FilterableEvent>(events: T[], filters: EventFilters): T[] {
  return events.filter((event) => {
    if (filters.date && brusselsDateKey(new Date(event.startsAt)) !== filters.date) return false;
    if (filters.platform && !event.platforms.includes(filters.platform)) return false;
    if (filters.spots && spotsLeft(event.capacity, event.rsvpCount) === 0) return false;
    return true;
  });
}

/** Distinct Antwerp dates that have at least one event, in order. */
export function eventDates(events: FilterableEvent[]): string[] {
  return [...new Set(events.map((e) => brusselsDateKey(new Date(e.startsAt))))].sort();
}
