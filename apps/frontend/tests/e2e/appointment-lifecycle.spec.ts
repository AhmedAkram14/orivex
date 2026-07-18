import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

test.describe('Appointment lifecycle', () => {
  test('shows the calendar and an honest empty upcoming-appointments state', async ({ page }) => {
    await loginAs(page, 'patient');

    await page.goto('/en/patient/appointments');

    await expect(page.getByText('Calendar')).toBeVisible();
    await expect(page.getByText('No upcoming appointments')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book appointment' })).toBeVisible();
  });

  test('switches to the History tab and shows its own empty state with filters', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/en/patient/appointments');
    await expect(page.getByText('No upcoming appointments')).toBeVisible();

    await page.getByRole('tab', { name: 'History' }).click();

    await expect(page.getByText('No appointment history yet')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Completed' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cancelled' })).toBeVisible();
  });

  test('the booking page is an honest placeholder, not a broken real-flow attempt', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/en/patient/appointments');

    await page.getByRole('link', { name: 'Book appointment' }).click();

    await expect(page).toHaveURL(/\/en\/patient\/appointments\/book$/);
    await expect(page.getByText("Booking isn't available yet")).toBeVisible();
  });
});
