import { expect, test } from '@playwright/test';
import { adminDb, confirmLinkFrom, countEmails, followConfirmLink, isoDateYearsAgo, uniqueEmail, waitForEmail } from './helpers';

test.describe('Signup', () => {
  test('rejects anyone under 13 without storing or sending anything', async ({ page }) => {
    const email = uniqueEmail('kid');
    await page.goto('/en/signup');
    await page.getByLabel('Display name').fill('Young Player');
    await page.getByLabel('Date of birth').fill(isoDateYearsAgo(13, 1)); // turns 13 tomorrow
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: /signup link/i }).click();

    await expect(page.getByRole('main').getByRole('alert')).toContainText('Sorry, you need to be at least 13.');
    await expect(page).toHaveURL(/\/en\/signup$/);

    const { data } = await adminDb().auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((u) => u.email === email)).toBe(false);
    expect(await countEmails(email)).toBe(0);
  });

  test('creates an account through the emailed link and keeps the DOB out of auth metadata', async ({ page }) => {
    const email = uniqueEmail('signup');
    const dob = isoDateYearsAgo(19);
    await page.goto('/en/signup');
    await page.getByLabel('Display name').fill('Launch Fan');
    await page.getByLabel('Date of birth').fill(dob);
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: /signup link/i }).click();

    await expect(page).toHaveURL(/\/en\/auth\/check-email/);
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();

    const mail = await waitForEmail(email, /Confirm your Wanted Level account/);
    await followConfirmLink(page, confirmLinkFrom(mail.html));

    await expect(page).toHaveURL(/\/en\/account/);
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
    await expect(page.getByLabel('Display name')).toHaveValue('Launch Fan');

    const db = adminDb();
    const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
    const user = data.users.find((u) => u.email === email);
    expect(user).toBeTruthy();
    expect(user?.email_confirmed_at).toBeTruthy();
    expect(user?.user_metadata).not.toHaveProperty('date_of_birth');
    const { data: profile } = await db.from('profiles').select('date_of_birth, display_name').eq('id', user!.id).single();
    expect(profile).toEqual({ date_of_birth: dob, display_name: 'Launch Fan' });
  });
});
