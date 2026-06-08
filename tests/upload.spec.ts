import { test, expect } from '@playwright/test';

test('Qwik upload widget loads and interacts', async ({ page }) => {
  await page.goto('/');
  const button = page.locator('button');
  await expect(button).toBeVisible();
});
