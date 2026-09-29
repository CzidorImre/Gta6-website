import { z } from 'zod';
import { isValidIsoDate } from './age';
import { EVENT_MIN_AGES, PLATFORMS, REPORT_CATEGORIES, VENUE_KINDS, isInAntwerpArea } from './constants';

/**
 * Form schemas. Error messages are field names; forms show the matching `form.errors.<field>`
 * message. The database re-checks everything that matters.
 */
const trimmed = (min: number, max: number, field: string) => z.string().trim().min(min, field).max(max, field);

const httpsUrl = z
  .string()
  .trim()
  .max(200, 'socialUrl')
  .refine((v) => {
    try {
      return new URL(v).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'socialUrl');

const optionalHttpsUrl = z.union([z.literal(''), httpsUrl]).transform((v) => (v === '' ? null : v));

const isoDate = (field: string) => z.string().trim().refine(isValidIsoDate, field);
const time = (field: string) => z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, field);
const checkbox = (field: string) => z.literal('on', field);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('email')).pipe(z.string().max(254, 'email'));

export const signupSchema = z.object({
  displayName: trimmed(2, 40, 'displayName'),
  dateOfBirth: isoDate('dateOfBirth'),
  email: emailSchema,
});

export const loginSchema = z.object({ email: emailSchema });

export const profileSchema = z.object({
  displayName: trimmed(2, 40, 'displayName'),
  socialUrl: optionalHttpsUrl,
});

export const applicationSchema = z.object({
  orgName: trimmed(2, 80, 'orgName'),
  socialUrl: httpsUrl,
  venueName: trimmed(2, 80, 'venueName'),
  venueAddress: trimmed(5, 200, 'venueAddress'),
  venueKind: z.enum(VENUE_KINDS, 'venueKind'),
  message: z.string().trim().max(1000, 'message').optional().default(''),
  publicVenue: checkbox('publicVenue'),
});

const coordinate = z.coerce.number('location');

export const venueSchema = z
  .object({
    venueName: trimmed(2, 80, 'venueName'),
    venueAddress: trimmed(5, 200, 'venueAddress'),
    venueKind: z.enum(VENUE_KINDS, 'venueKind'),
    lat: coordinate,
    lng: coordinate,
  })
  .refine((v) => isInAntwerpArea(v.lat, v.lng), { message: 'location', path: ['lat'] });

export const eventSchema = z.object({
  title: trimmed(3, 80, 'title'),
  description: z.string().trim().max(2000, 'description').optional().default(''),
  date: isoDate('date'),
  startTime: time('startTime'),
  endTime: time('endTime'),
  platforms: z.array(z.enum(PLATFORMS)).min(1, 'platforms').max(2, 'platforms'),
  consoleCount: z.coerce.number('consoleCount').int('consoleCount').min(1, 'consoleCount').max(100, 'consoleCount'),
  capacity: z.coerce.number('capacity').int('capacity').min(1, 'capacity').max(500, 'capacity'),
  minAge: z.coerce
    .number('minAge')
    .refine((v) => (EVENT_MIN_AGES as readonly number[]).includes(v), 'minAge'),
  publicVenue: checkbox('publicVenue'),
});

export const reportSchema = z.object({
  targetType: z.enum(['event', 'group_post'], 'target'),
  targetId: z.uuid('target'),
  category: z.enum(REPORT_CATEGORIES, 'category'),
  details: z.string().trim().max(1000, 'details').optional().default(''),
});

export const groupPostSchema = z.object({
  note: trimmed(1, 280, 'note'),
  discordHandle: z.union([
    z.literal(''),
    z.string().trim().regex(/^[A-Za-z0-9_.]{2,32}(#[0-9]{4})?$/, 'discordHandle'),
  ]),
});

export const reasonSchema = trimmed(3, 1000, 'reason');

export type FieldErrors = Partial<Record<string, string>>;

/** First error per field, keyed by field name, value = message key. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? issue.message);
    if (!out[field]) out[field] = issue.message;
  }
  return out;
}
