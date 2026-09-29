import { describe, expect, it } from 'vitest';
import { ageOn, isValidIsoDate } from '@/lib/age';

describe('ageOn', () => {
  it('counts whole years', () => {
    expect(ageOn('2000-06-15', '2026-06-14')).toBe(25);
    expect(ageOn('2000-06-15', '2026-06-15')).toBe(26);
  });

  it('treats the 13th birthday itself as 13 (signup minimum)', () => {
    expect(ageOn('2013-11-19', '2026-11-19')).toBe(13);
    expect(ageOn('2013-11-20', '2026-11-19')).toBe(12);
  });

  it('matches Postgres age() for 29 February birthdays', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
    expect(ageOn('2008-02-29', '2028-02-29')).toBe(20);
  });

  it('rejects impossible dates', () => {
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('19-11-2026')).toBe(false);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(() => ageOn('nope', '2026-01-01')).toThrow();
  });
});
