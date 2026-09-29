import { expect, test } from '@playwright/test';

test.use({ hasTouch: false, isMobile: false, viewport: { width: 1280, height: 900 } });

test('the site works with a keyboard: skip link, filters, map pins', async ({ page }) => {
  await page.goto('/en');

  // First Tab stop is the skip link, and it moves focus into the main content.
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);

  // Filters are links: reachable and usable with the keyboard, no JavaScript needed.
  const ps5 = page.getByRole('link', { name: 'PS5', exact: true });
  await ps5.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/platform=ps5/);
  await expect(page.getByRole('link', { name: 'PS5', exact: true })).toHaveAttribute('aria-current', 'true');

  // Map pins are focusable buttons with a text label; Enter opens the popup with a real link.
  const pin = page.locator('.wl-pin[role="button"]').first();
  await expect(pin).toHaveAttribute('aria-label', /spots? left|Full/);
  await pin.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.leaflet-popup').getByRole('link', { name: 'View event' }).first()).toBeVisible();

  // The list view is the accessible alternative with the same events.
  await page.getByRole('link', { name: 'List', exact: true }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(page.getByRole('article').first()).toBeVisible();
});
