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

  // Onboarding Redesign integration-gap closure (2026-07-25): this generic
  // link (no doctorId, unlike the doctor-profile page's own "Book
  // appointment" CTA) reaches the real Booking Architecture with nothing to
  // book against yet -- an honest "pick a doctor first" state, not a broken
  // real-flow attempt (the full real flow is covered end to end by
  // `real-booking-flow.spec.ts`).
  test('the booking page without a doctor selected shows an honest state, not a broken real-flow attempt', async ({
    page,
  }) => {
    await loginAs(page, 'patient');
    await page.goto('/en/patient/appointments');

    await page.getByRole('link', { name: 'Book appointment' }).click();

    await expect(page).toHaveURL(/\/en\/patient\/appointments\/book$/);
    await expect(page.getByText('No doctor selected')).toBeVisible();
  });
});
