import { expect, test } from '@playwright/test';
import { accessTokenFrom, adminDb, createPublishedEvent, createUser, isoDateYearsAgo, loginAs, SUPABASE_URL, uniqueEmail } from './helpers';

test('first RSVP asks for the community rules, then books the spot', async ({ page }) => {
  const email = uniqueEmail('first');
  const userId = await createUser({ email, name: 'First Timer', dateOfBirth: '2000-01-01' });
  const eventId = await createPublishedEvent({ title: `E2E rules ${Date.now()}` });
  await loginAs(page, email, `/en/events/${eventId}`);

  await page.getByRole('link', { name: "RSVP, I'm going" }).click();
  await expect(page).toHaveURL(/\/en\/rules\?rsvp=/);
  await page.getByLabel("I've read the community & safety rules and I'll follow them.").check();
  await page.getByRole('button', { name: 'Accept and RSVP' }).click();

  await expect(page).toHaveURL(new RegExp(`/en/events/${eventId}\\?rsvp=going`));
  await expect(page.getByText("You're going", { exact: true })).toBeVisible();
  const { data: profile } = await adminDb().from('profiles').select('rules_accepted_at, rules_version').eq('id', userId).single();
  expect(profile?.rules_accepted_at).toBeTruthy();
  expect(profile?.rules_version).toBe('2026-10');
});

test('RSVP is blocked when the event is full, even if the page was loaded with a spot left', async ({ page }) => {
  const db = adminDb();
  const eventId = await createPublishedEvent({ title: `E2E last spot ${Date.now()}`, capacity: 1 });
  const bob = uniqueEmail('bob');
  await createUser({ email: bob, name: 'Bob', dateOfBirth: '1998-02-02', rulesAccepted: true });
  const aliceId = await createUser({ email: uniqueEmail('alice'), name: 'Alice', dateOfBirth: '1998-02-02', rulesAccepted: true });

  await loginAs(page, bob, `/en/events/${eventId}`);
  await expect(page.getByText('1 spot left').first()).toBeVisible();
  const rsvp = page.getByRole('button', { name: "RSVP, I'm going" });
  await expect(rsvp).toBeEnabled();

  // Alice takes the last spot while Bob is looking at the page.
  const { error } = await db.from('rsvps').insert({ event_id: eventId, user_id: aliceId });
  expect(error).toBeNull();

  await rsvp.click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Sorry, this event just filled up.');
  await expect(page.getByRole('button', { name: 'Full' })).toBeDisabled();
  const { data: rows } = await db.from('rsvps').select('user_id').eq('event_id', eventId);
  expect(rows).toEqual([{ user_id: aliceId }]);
});

test('RSVP is blocked for someone under the event minimum age, in the UI and in the database', async ({ page, context }) => {
  const eventId = await createPublishedEvent({ title: `E2E 18 plus ${Date.now()}`, minAge: 18 });
  const teen = uniqueEmail('teen');
  await createUser({ email: teen, name: 'Teen', dateOfBirth: isoDateYearsAgo(16), rulesAccepted: true });
  await loginAs(page, teen, `/en/events/${eventId}`);

  await expect(page.getByText(/This one is 18\+ on the day of the event, so you can't RSVP/)).toBeVisible();
  await expect(page.getByRole('button', { name: "RSVP, I'm going" })).toHaveCount(0);

  // Calling the database directly with the teen's own session is refused as well.
  const token = await accessTokenFrom(context);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rsvp_event`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '', authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_event_id: eventId }),
  });
  expect(res.status).toBe(400);
  expect(((await res.json()) as { message: string }).message).toBe('UNDER_EVENT_MIN_AGE');
  const { count } = await adminDb().from('rsvps').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
  expect(count).toBe(0);
});
