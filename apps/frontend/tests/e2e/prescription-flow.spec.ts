import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

test.describe('Prescription flow', () => {
  test('shows an honest empty state for both the Active and Previous tabs', async ({ page }) => {
    await loginAs(page, 'patient');

    await page.goto('/en/patient/prescriptions');

    await expect(page.getByRole('tab', { name: 'Active' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Previous' })).toBeVisible();
    await expect(page.getByText('No active prescriptions')).toBeVisible();

    await page.getByRole('tab', { name: 'Previous' }).click();

    await expect(page.getByText(/no (previous|past) prescriptions/i)).toBeVisible();
  });
});
