import { describe, expect, it } from 'vitest';
import { applicationSchema, eventSchema, fieldErrorsFrom, groupPostSchema, profileSchema, reportSchema, signupSchema, venueSchema } from '@/lib/validation';

describe('signupSchema', () => {
  it('accepts a normal signup and normalizes the email', () => {
    const r = signupSchema.safeParse({ displayName: '  Sam ', dateOfBirth: '2001-06-30', email: ' Sam@Example.COM ' });
    expect(r.success && r.data).toEqual({ displayName: 'Sam', dateOfBirth: '2001-06-30', email: 'sam@example.com' });
  });

  it('flags each bad field by name', () => {
    const r = signupSchema.safeParse({ displayName: 'x', dateOfBirth: '2001-02-30', email: 'not-an-email' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error)).toEqual({ displayName: 'displayName', dateOfBirth: 'dateOfBirth', email: 'email' });
  });
});

describe('profileSchema', () => {
  it('allows an empty social link and requires https otherwise', () => {
    expect(profileSchema.parse({ displayName: 'Sam', socialUrl: '' }).socialUrl).toBeNull();
    expect(profileSchema.safeParse({ displayName: 'Sam', socialUrl: 'http://example.com' }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: 'Sam', socialUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
});

describe('applicationSchema', () => {
  const base = {
    orgName: 'Pixel Club',
    socialUrl: 'https://instagram.com/pixel',
    venueName: 'Pixel Bar',
    venueAddress: 'Groenplaats 1, 2000 Antwerpen',
    venueKind: 'bar',
    message: '',
    publicVenue: 'on',
  };
  it('requires the public venue confirmation', () => {
    expect(applicationSchema.safeParse(base).success).toBe(true);
    expect(applicationSchema.safeParse({ ...base, publicVenue: null }).success).toBe(false);
  });
  it('rejects unknown venue kinds', () => {
    expect(applicationSchema.safeParse({ ...base, venueKind: 'house_party' }).success).toBe(false);
  });
});

describe('venueSchema', () => {
  it('only accepts pins in the Antwerp area', () => {
    const v = { venueName: 'Bar', venueAddress: 'Meir 1, Antwerpen', venueKind: 'bar' };
    expect(venueSchema.safeParse({ ...v, lat: '51.2194', lng: '4.4025' }).success).toBe(true);
    expect(venueSchema.safeParse({ ...v, lat: '50.8467', lng: '4.3525' }).success).toBe(false);
  });
});

describe('eventSchema', () => {
  const base = {
    title: 'Launch night',
    description: '',
    date: '2026-11-18',
    startTime: '22:00',
    endTime: '03:00',
    platforms: ['ps5'],
    consoleCount: '4',
    capacity: '30',
    minAge: '16',
    publicVenue: 'on',
  };
  it('accepts a valid event and coerces numbers', () => {
    const r = eventSchema.parse(base);
    expect(r.capacity).toBe(30);
    expect(r.minAge).toBe(16);
  });
  it('only allows 13, 16 or 18 as minimum age', () => {
    expect(eventSchema.safeParse({ ...base, minAge: '15' }).success).toBe(false);
  });
  it('needs at least one known platform', () => {
    expect(eventSchema.safeParse({ ...base, platforms: [] }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, platforms: ['pc'] }).success).toBe(false);
  });
});

describe('groupPostSchema', () => {
  it('validates Discord handles', () => {
    expect(groupPostSchema.safeParse({ note: 'hi', discordHandle: '' }).success).toBe(true);
    expect(groupPostSchema.safeParse({ note: 'hi', discordHandle: 'sam_plays.gg' }).success).toBe(true);
    expect(groupPostSchema.safeParse({ note: 'hi', discordHandle: 'old#1234' }).success).toBe(true);
    expect(groupPostSchema.safeParse({ note: 'hi', discordHandle: 'has spaces' }).success).toBe(false);
    expect(groupPostSchema.safeParse({ note: 'x'.repeat(281), discordHandle: '' }).success).toBe(false);
  });
});

describe('reportSchema', () => {
  it('requires a known category and a uuid target', () => {
    const ok = { targetType: 'event', targetId: 'c0000000-0000-4000-8000-000000000001', category: 'safety', details: '' };
    expect(reportSchema.safeParse(ok).success).toBe(true);
    expect(reportSchema.safeParse({ ...ok, category: 'boring' }).success).toBe(false);
    expect(reportSchema.safeParse({ ...ok, targetId: '1 or 1=1' }).success).toBe(false);
  });
});
