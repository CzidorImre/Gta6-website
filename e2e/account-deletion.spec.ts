import { expect, test } from '@playwright/test';
import { adminDb, createPublishedEvent, createUser, loginAs, uniqueEmail, waitForEmail } from './helpers';

test('self-service account deletion removes the user and their data', async ({ page }) => {
  const db = adminDb();
  const email = uniqueEmail('leaver');
  const userId = await createUser({ email, name: 'Leaver', dateOfBirth: '1997-07-07', rulesAccepted: true });
  const eventId = await createPublishedEvent({ title: `E2E farewell ${Date.now()}` });

  // Leave a trail: an RSVP and a group board post, both through the UI.
  await loginAs(page, email, `/en/events/${eventId}`);
  await page.getByRole('button', { name: "RSVP, I'm going" }).click();
  await expect(page.getByText("You're going", { exact: true })).toBeVisible();
  await page.getByLabel('Your note').fill('Solo, anyone want to squad up?');
  await page.getByLabel('Discord username (optional)').fill('leaver_gg');
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Your post is up.' })).toBeVisible();

  expect((await db.from('rsvps').select('*', { count: 'exact', head: true }).eq('user_id', userId)).count).toBe(1);
  expect((await db.from('group_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId)).count).toBe(1);

  await page.goto('/en/account');
  await page.getByLabel('Yes, delete my account and all my data.').check();
  await page.getByRole('button', { name: 'Delete my account' }).click();

  await expect(page).toHaveURL(/\/en\?deleted=1/);
  await expect(page.getByRole('status').filter({ hasText: 'Your account and everything linked to it have been deleted' })).toBeVisible();

  const { data: authUser } = await db.auth.admin.getUserById(userId);
  expect(authUser.user).toBeNull();
  expect((await db.from('profiles').select('*', { count: 'exact', head: true }).eq('id', userId)).count).toBe(0);
  expect((await db.from('rsvps').select('*', { count: 'exact', head: true }).eq('user_id', userId)).count).toBe(0);
  expect((await db.from('group_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId)).count).toBe(0);
  const { data: event } = await db.from('events').select('rsvp_count').eq('id', eventId).single();
  expect(event?.rsvp_count).toBe(0);

  await waitForEmail(email, /account is deleted/);

  // Signed out: the account page now asks to log in.
  await page.goto('/en/account');
  await expect(page).toHaveURL(/\/en\/login/);
});
