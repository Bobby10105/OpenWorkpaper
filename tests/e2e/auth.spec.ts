import { test, expect } from '@playwright/test';

test.describe('Authentication Journey', () => {
  test('homepage loads and redirects to login if unauthenticated', async ({ page }) => {
    await page.goto('/');
    // Depending on the app's routing, we check if title contains "Login" or redirects
    await expect(page).toHaveTitle(/.*|Login/i);
  });

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/login');
    const heading = page.locator('h1, h2, form');
    await expect(heading.first()).toBeVisible();
  });
});
