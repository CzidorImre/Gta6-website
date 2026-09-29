import { expect, test } from '@playwright/test';
import { adminDb, createPublishedEvent, createUser, loginAs, uniqueEmail, waitForEmail } from './helpers';

test('a safety report hides the event instantly and emails the admins', async ({ page, browser }) => {
  const title = `E2E suspicious night ${Date.now()}`;
  const eventId = await createPublishedEvent({ title });
  const email = uniqueEmail('reporter');
  await createUser({ email, name: 'Reporter', dateOfBirth: '1990-03-03' });

  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  expect((await anonPage.goto(`/en/events/${eventId}`))?.status()).toBe(200);

  await loginAs(page, email, `/en/events/${eventId}`);
  await page.getByRole('link', { name: 'Report this event' }).click();
  await expect(page.getByRole('heading', { name: 'Report this event' })).toBeVisible();
  await page.getByRole('radio', { name: /Safety/ }).check();
  await page.getByLabel(/What happened/).fill('The organizer asks people to come to his flat instead.');
  await page.getByRole('button', { name: 'Send report' }).click();

  await expect(page).toHaveURL(/\/en\/report\/thanks\?hidden=1/);
  await expect(page.getByRole('status')).toContainText('We hid it right away.');

  // Gone for everyone else, immediately.
  expect((await anonPage.goto(`/en/events/${eventId}`))?.status()).toBe(404);
  await anonPage.goto('/en?view=list');
  await expect(anonPage.getByRole('link', { name: title })).toHaveCount(0);
  await anon.close();

  const { data: event } = await adminDb().from('events').select('hidden_at, hidden_reason').eq('id', eventId).single();
  expect(event?.hidden_at).toBeTruthy();
  expect(event?.hidden_reason).toBe('safety_report');

  const mail = await waitForEmail('admin@wantedlevel.test', new RegExp(`New safety report: ${title}`));
  expect(mail.text).toContain('hidden automatically');
});
