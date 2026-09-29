import { describe, expect, it } from 'vitest';
import { applyFilters, eventDates, filtersToQuery, parseFilters } from '@/lib/filters';
import { spotsLeft, spotsLevel } from '@/lib/spots';

const events = [
  { id: 'a', startsAt: '2026-11-18T21:00:00Z', platforms: ['ps5', 'xbox'], capacity: 40, rsvpCount: 1 },
  { id: 'b', startsAt: '2026-11-19T11:00:00Z', platforms: ['ps5'], capacity: 10, rsvpCount: 10 },
  { id: 'c', startsAt: '2026-11-18T23:30:00Z', platforms: ['xbox'], capacity: 5, rsvpCount: 2 },
];

describe('filters', () => {
  it('parses and ignores junk', () => {
    expect(parseFilters({ view: 'list', date: '2026-11-19', platform: 'xbox', spots: '1' })).toEqual({ view: 'list', date: '2026-11-19', platform: 'xbox', spots: true });
    expect(parseFilters({ view: 'grid', date: "'; drop", platform: 'pc' })).toEqual({ view: 'map', date: null, platform: null, spots: false });
  });

  it('filters by Antwerp date, platform and spots left', () => {
    const ids = (f: Parameters<typeof applyFilters>[1]) => applyFilters(events, f).map((e) => e.id);
    expect(ids({ view: 'map', date: '2026-11-19', platform: null, spots: false })).toEqual(['b', 'c']);
    expect(ids({ view: 'map', date: null, platform: 'xbox', spots: false })).toEqual(['a', 'c']);
    expect(ids({ view: 'map', date: null, platform: null, spots: true })).toEqual(['a', 'c']);
  });

  it('lists distinct dates in order', () => {
    expect(eventDates(events)).toEqual(['2026-11-18', '2026-11-19']);
  });

  it('builds short query strings', () => {
    expect(filtersToQuery({ view: 'map', date: null, platform: null, spots: false })).toEqual({});
    expect(filtersToQuery({ view: 'list', date: null, platform: 'ps5', spots: true })).toEqual({ view: 'list', platform: 'ps5', spots: '1' });
  });
});

describe('spots', () => {
  it('never goes negative', () => {
    expect(spotsLeft(10, 12)).toBe(0);
  });
  it('classifies pins', () => {
    expect(spotsLevel(40, 1)).toBe('plenty');
    expect(spotsLevel(40, 33)).toBe('few');
    expect(spotsLevel(10, 8)).toBe('few');
    expect(spotsLevel(10, 10)).toBe('full');
  });
});
