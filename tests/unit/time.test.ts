import { describe, expect, it } from 'vitest';
import { brusselsDateKey, brusselsLocalToUtc, brusselsOffsetMs, brusselsTimeKey } from '@/lib/time';

describe('Europe/Brussels time helpers', () => {
  it('converts winter (CET, UTC+1) wall time', () => {
    expect(brusselsLocalToUtc('2026-11-18', '22:00').toISOString()).toBe('2026-11-18T21:00:00.000Z');
    expect(brusselsLocalToUtc('2026-11-19', '00:00').toISOString()).toBe('2026-11-18T23:00:00.000Z');
  });

  it('converts summer (CEST, UTC+2) wall time', () => {
    expect(brusselsLocalToUtc('2026-07-01', '20:00').toISOString()).toBe('2026-07-01T18:00:00.000Z');
  });

  it('handles the spring-forward gap (02:30 does not exist on 29 March 2026)', () => {
    const d = brusselsLocalToUtc('2026-03-29', '02:30');
    expect(['2026-03-29T00:30:00.000Z', '2026-03-29T01:30:00.000Z']).toContain(d.toISOString());
  });

  it('picks the earlier instant in the autumn overlap (02:30 happens twice on 25 October 2026)', () => {
    expect(brusselsLocalToUtc('2026-10-25', '02:30').toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('round-trips date and time keys', () => {
    const d = brusselsLocalToUtc('2026-11-19', '23:45');
    expect(brusselsDateKey(d)).toBe('2026-11-19');
    expect(brusselsTimeKey(d)).toBe('23:45');
  });

  it('uses the Antwerp date, not the UTC date, around midnight', () => {
    expect(brusselsDateKey(new Date('2026-11-18T23:30:00Z'))).toBe('2026-11-19');
  });

  it('knows the offset', () => {
    expect(brusselsOffsetMs(new Date('2026-01-15T12:00:00Z'))).toBe(3_600_000);
    expect(brusselsOffsetMs(new Date('2026-07-15T12:00:00Z'))).toBe(7_200_000);
  });

  it('rejects malformed input', () => {
    expect(() => brusselsLocalToUtc('2026-11-19', '9pm')).toThrow();
  });
});
