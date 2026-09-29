export type SpotsLevel = 'plenty' | 'few' | 'full';

export function spotsLeft(capacity: number, rsvpCount: number): number {
  return Math.max(capacity - rsvpCount, 0);
}

/** "few" when at most 3 spots or 20% of capacity remain. */
export function spotsLevel(capacity: number, rsvpCount: number): SpotsLevel {
  const left = spotsLeft(capacity, rsvpCount);
  if (left === 0) return 'full';
  if (left <= Math.max(3, Math.floor(capacity * 0.2))) return 'few';
  return 'plenty';
}
