import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

test.describe('Doctor Dashboard', () => {
  test('renders the welcome message and an honest zero-state summary', async ({ page }) => {
    await loginAs(page, 'doctor');

    await page.goto('/en/doctor');

    await expect(page.getByText('Welcome back, Dr. Sarah Ahmed.')).toBeVisible();
    await expect(page.getByText('Nothing scheduled yet')).toBeVisible();
  });
});
