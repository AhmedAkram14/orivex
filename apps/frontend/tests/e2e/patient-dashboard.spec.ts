import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

test.describe('Patient Dashboard', () => {
  test('renders the welcome message and an honest zero-state summary', async ({ page }) => {
    await loginAs(page, 'patient');

    await page.goto('/en/patient');

    // WelcomeHeader now shows a time-of-day greeting with the first name
    // only ("Good morning/afternoon/evening, Amina 👋"), not a static
    // "Welcome back, {fullName}." string -- match whichever period is
    // active when this actually runs.
    await expect(page.getByText(/Good (morning|afternoon|evening), Amina/)).toBeVisible();
    await expect(page.getByText('No appointments scheduled yet')).toBeVisible();
    await expect(page.getByText('No active prescriptions')).toBeVisible();
  });
});
