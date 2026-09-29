import { describe, expect, it } from 'vitest';
import { errorCodeFrom } from '@/lib/errors';

describe('errorCodeFrom', () => {
  it('maps database error codes', () => {
    expect(errorCodeFrom({ message: 'EVENT_FULL' })).toBe('EVENT_FULL');
    expect(errorCodeFrom({ message: 'UNDER_EVENT_MIN_AGE' })).toBe('UNDER_EVENT_MIN_AGE');
  });
  it('finds codes wrapped by Supabase Auth', () => {
    expect(errorCodeFrom({ message: 'Database error saving new user: UNDER_MINIMUM_AGE' })).toBe('UNDER_MINIMUM_AGE');
  });
  it('falls back to a generic error and never leaks raw messages', () => {
    expect(errorCodeFrom({ message: 'duplicate key value violates unique constraint' })).toBe('GENERIC');
    expect(errorCodeFrom(null)).toBe('GENERIC');
  });
});
