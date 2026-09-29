import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText, foldIcsLine } from '@/lib/ics';

const event = {
  uid: 'abc@wantedlevel.be',
  title: 'Launch; night, at "Pixel" \\ Pint',
  description: 'Line one\nLine two with émojis 🎮 and a long long long long long long long long long long long long text',
  location: 'Groenplaats 1, Antwerpen',
  start: new Date('2026-11-18T21:00:00Z'),
  end: new Date('2026-11-19T02:00:00Z'),
  url: 'https://wantedlevel.be/en/events/abc',
  now: new Date('2026-10-01T10:00:00Z'),
};

describe('buildIcs', () => {
  const ics = buildIcs(event);

  it('uses CRLF line endings', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });

  it('writes times in UTC', () => {
    expect(ics).toContain('DTSTART:20261118T210000Z');
    expect(ics).toContain('DTEND:20261119T020000Z');
    expect(ics).toContain('DTSTAMP:20261001T100000Z');
  });

  it('escapes special characters', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\;b\\,c\\\\d\\ne');
    expect(ics).toContain('SUMMARY:Launch\; night\\, at "Pixel" \\\\ Pint');
  });

  it('folds lines at 75 octets without splitting characters', () => {
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    const folded = foldIcsLine(`DESCRIPTION:${'🎮'.repeat(40)}`);
    expect(folded.split('\r\n ').join('')).toBe(`DESCRIPTION:${'🎮'.repeat(40)}`);
  });
});
