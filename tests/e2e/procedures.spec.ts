import { test, expect } from '@playwright/test';

test.describe('Procedures Journey', () => {
  test('unauthenticated users cannot view procedures dashboard', async ({ page }) => {
    const response = await page.goto('/procedures');
    // Assuming unauthenticated users are either redirected or shown an error
    await expect(page).not.toHaveURL(/\/procedures$/);
  });
});
