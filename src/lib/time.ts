import { TIME_ZONE } from './constants';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function brusselsParts(date: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Milliseconds Brussels is ahead of UTC at a given instant (3600000 in winter, 7200000 in summer). */
export function brusselsOffsetMs(date: Date): number {
  const p = brusselsParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock date and time in Antwerp (what an organizer types) to an absolute instant.
 * During the autumn DST overlap the earlier instant is used; times skipped in spring move forward.
 */
export function brusselsLocalToUtc(date: string, time: string): Date {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dm || !tm) throw new Error('Invalid date or time');
  const wall = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  const firstGuess = wall - brusselsOffsetMs(new Date(wall));
  const secondGuess = wall - brusselsOffsetMs(new Date(firstGuess));
  return new Date(Math.min(firstGuess, secondGuess));
}

/** YYYY-MM-DD of an instant in Antwerp. */
export function brusselsDateKey(date: Date): string {
  const p = brusselsParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** HH:MM of an instant in Antwerp. */
export function brusselsTimeKey(date: Date): string {
  const p = brusselsParts(date);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function brusselsToday(now: Date = new Date()): string {
  return brusselsDateKey(now);
}

/** Intl locale used for formatting (next-intl locale "nl-BE" already is one). */
export function intlLocale(locale: string): string {
  return locale === 'nl-BE' ? 'nl-BE' : 'en-GB';
}
