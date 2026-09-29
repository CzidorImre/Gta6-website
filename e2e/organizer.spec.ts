import { expect, test } from '@playwright/test';
import { adminDb, createUser, isoDateInDays, loginAs, loginAsAdmin, SEED, uniqueEmail, waitForEmail } from './helpers';

test('organizer application → admin approval (with TOTP)', async ({ page, browser }) => {
  const email = uniqueEmail('applicant');
  const orgName = `E2E Bar ${Date.now()}`;
  await createUser({ email, name: 'Applicant', dateOfBirth: '1994-04-04' });
  await loginAs(page, email, '/en/organizer/apply');

  await page.getByLabel('Organization or venue name').fill(orgName);
  await page.getByLabel('Website or social media page').fill('https://www.instagram.com/e2e_bar');
  await page.getByLabel('Venue name', { exact: true }).fill('E2E Bar');
  await page.getByLabel('Venue address').fill('Oude Koornmarkt 1, 2000 Antwerpen');
  await page.getByLabel('Type of venue').selectOption('bar');
  await page.getByLabel(/I confirm this is a public venue/).check();
  await page.getByRole('button', { name: 'Send application' }).click();

  await expect(page).toHaveURL(/\/en\/organizer\?applied=1/);
  await expect(page.getByRole('status').filter({ hasText: 'Your application is in' })).toBeVisible();
  await waitForEmail('admin@wantedlevel.test', new RegExp(`New organizer application: ${orgName}`));

  // Admin, in a separate browser session.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await loginAsAdmin(admin);
  await admin.goto('/en/admin/applications');
  const card = admin.getByRole('listitem').filter({ hasText: orgName });
  const reason = `Checked their Instagram and the venue address (${orgName}).`;
  await card.getByLabel(/Reason/).fill(reason);
  await card.getByRole('button', { name: 'Approve' }).click();
  await expect(admin.getByRole('status').filter({ hasText: 'Done' })).toBeVisible();
  await adminContext.close();

  const mail = await waitForEmail(email, /approved to host/);
  expect(mail.text).toContain('Reason: Checked their Instagram');

  await page.goto('/en/organizer');
  await expect(page.getByRole('heading', { name: 'Your events' })).toBeVisible();
  const { data: log } = await adminDb().from('moderation_actions').select('action, reason').eq('reason', reason);
  expect(log).toEqual([{ action: 'application_approved', reason }]);
});

test('event creation → admin publish', async ({ page, browser }) => {
  const title = `E2E launch night ${Date.now()}`;
  await loginAs(page, SEED.organizer, '/en/organizer/events/new');

  await page.getByRole('radio', { name: /Pixel & Pint/ }).check();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Description').fill('Bring your own controller.');
  await page.getByLabel('Date').fill(isoDateInDays(20));
  await page.getByLabel('Starts').fill('21:00');
  await page.getByLabel('Ends').fill('02:00');
  await page.getByLabel('Spots (people)').fill('12');
  await page.getByLabel('Minimum age', { exact: true }).selectOption('18');
  await page.getByLabel(/I confirm this is a public venue, the event is free/).check();
  await page.getByRole('button', { name: 'Send for review' }).click();

  await expect(page).toHaveURL(/\/en\/organizer\?saved=1/);
  const row = page.getByRole('listitem').filter({ hasText: title });
  await expect(row.getByText('Waiting for review')).toBeVisible();

  const { data: event } = await adminDb().from('events').select('id, status, ends_at, starts_at').eq('title', title).single();
  expect(event?.status).toBe('pending');
  // Crosses midnight: ends 5 hours after it starts.
  expect(new Date(event!.ends_at).getTime() - new Date(event!.starts_at).getTime()).toBe(5 * 3_600_000);

  // Not public while pending.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  expect((await anonPage.goto(`/en/events/${event!.id}`))?.status()).toBe(404);

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await loginAsAdmin(admin);
  await admin.goto('/en/admin/events');
  const card = admin.getByRole('listitem').filter({ hasText: title });
  await card.getByText('Actions').click();
  await card.getByLabel(/Reason/).first().fill('Venue is verified, details look right.');
  await card.getByRole('button', { name: 'Publish' }).click();
  await expect(admin.getByRole('status').filter({ hasText: 'Done' })).toBeVisible();
  await adminContext.close();

  expect((await anonPage.goto(`/en/events/${event!.id}`))?.status()).toBe(200);
  await expect(anonPage.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await anonPage.goto('/en?view=list');
  await expect(anonPage.getByRole('link', { name: title })).toBeVisible();
  await anon.close();

  // The seeded organizer's language is Dutch, so the email is too.
  await waitForEmail(SEED.organizer, new RegExp(`Je event staat online: ${title}`));
});
