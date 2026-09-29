import { describe, expect, it } from 'vitest';
import { type EmailKind, renderEmail } from '@/lib/email/render';
import { parseAddress } from '@/lib/email/send';

const kinds: EmailKind[] = [
  'adminNewReport', 'adminNewApplication', 'adminEventPending', 'applicationApproved', 'applicationRejected',
  'eventPublished', 'eventRejected', 'eventRemoved', 'eventHidden', 'eventRestored', 'postRemoved', 'postHidden',
  'postRestored', 'userBanned', 'userUnbanned', 'venueVerified', 'venueUnverified', 'eventCancelledAttendee',
  'eventRemovedAttendee', 'accountDeleted',
];

describe('notification emails', () => {
  it('render every kind in both languages', () => {
    for (const kind of kinds) {
      for (const locale of ['en', 'nl-BE'] as const) {
        const email = renderEmail(kind, locale, { title: 'Launch night', name: 'Pixel', reason: 'Checked', category: 'safety', details: 'x', hidden: '', url: 'https://wantedlevel.be/en' });
        expect(email.subject.length).toBeGreaterThan(5);
        expect(email.text).toContain('Wanted Level');
        expect(email.html).toContain(`lang="${locale}"`);
      }
    }
  });

  it('includes the reason and a link when given', () => {
    const email = renderEmail('eventRemoved', 'en', { title: 'Launch night', reason: 'Private address', url: 'https://wantedlevel.be/en/organizer' });
    expect(email.text).toContain('Reason: Private address');
    expect(email.html).toContain('href="https://wantedlevel.be/en/organizer"');
  });

  it('escapes user content in HTML', () => {
    const email = renderEmail('eventPublished', 'en', { title: '<script>alert(1)</script>' });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('is written in the recipient language', () => {
    expect(renderEmail('userBanned', 'nl-BE', {}).subject).toMatch(/geschorst/);
    expect(renderEmail('userBanned', 'en', {}).subject).toMatch(/suspended/);
  });

  it('parses the sender address', () => {
    expect(parseAddress('Wanted Level <noreply@wantedlevel.be>')).toEqual({ name: 'Wanted Level', email: 'noreply@wantedlevel.be' });
    expect(parseAddress('noreply@wantedlevel.be')).toEqual({ name: '', email: 'noreply@wantedlevel.be' });
  });
});
