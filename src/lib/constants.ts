export const SITE_NAME = 'Wanted Level';
export const CONTACT_EMAIL = 'hello@wantedlevel.be';
export const TIME_ZONE = 'Europe/Brussels';

/** GTA 6 unlocks at midnight on 19 November 2026, Belgian time (CET, UTC+1). */
export const LAUNCH_AT = '2026-11-19T00:00:00+01:00';

/** Keep in sync with public.current_rules_version() in the foundation migration. */
export const RULES_VERSION = '2026-10';

/** Belgium's age of digital consent. The database enforces it too (handle_new_user). */
export const MIN_SIGNUP_AGE = 13;
export const EVENT_MIN_AGES = [13, 16, 18] as const;
export type EventMinAge = (typeof EVENT_MIN_AGES)[number];

export const PLATFORMS = ['ps5', 'xbox'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const VENUE_KINDS = ['bar', 'gaming_cafe', 'student_association', 'other_public'] as const;
export type VenueKind = (typeof VENUE_KINDS)[number];

export const REPORT_CATEGORIES = ['safety', 'spam', 'wrong_info', 'other'] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const ANTWERP_CENTER = { lat: 51.2194, lng: 4.4025 } as const;
/** Keep in sync with public.in_antwerp_area(). */
export const ANTWERP_BOUNDS = { south: 51.05, north: 51.4, west: 4.15, east: 4.65 } as const;

export function isInAntwerpArea(lat: number, lng: number): boolean {
  return (
    lat >= ANTWERP_BOUNDS.south &&
    lat <= ANTWERP_BOUNDS.north &&
    lng >= ANTWERP_BOUNDS.west &&
    lng <= ANTWERP_BOUNDS.east
  );
}
