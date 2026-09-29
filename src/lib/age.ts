/**
 * Whole years between a birth date and a day, both as YYYY-MM-DD. Matches Postgres `age()`:
 * someone born on 29 February turns a year older on 1 March in non-leap years.
 */
export function ageOn(dateOfBirth: string, onDate: string): number {
  const [by, bm, bd] = parseIsoDate(dateOfBirth);
  const [y, m, d] = parseIsoDate(onDate);
  let years = y - by;
  if (m < bm || (m === bm && d < bd)) years -= 1;
  return years;
}

export function parseIsoDate(value: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Not an ISO date: ${value}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new Error(`Not a real date: ${value}`);
  }
  return [year, month, day];
}

export function isValidIsoDate(value: string): boolean {
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
}
