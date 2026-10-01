import { expect, test, type Page } from '@playwright/test';

// The doctor Overview's day strip shows the whole working day and says WHY nothing is open, from the doctor's real
// schedule; "nothing today" is said once in the greeting and once in a single "Today" card, never per card. The demo
// doctor Dr. Omar Hassan (src/mocks/demo-data) works 9 AM - 7 PM, Friday off, and has nothing booked on these days.
async function signInAsDemoDoctor(page: Page, at: string) {
  // Fixes Date for the page and the in-browser mock backend alike; timers keep running.
  await page.clock.setFixedTime(new Date(at));
  await page.goto('/en/login');
  await page.getByLabel('Email').fill('doctor01@orivex.dev');
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/doctor$/);
}

const strip = (page: Page) => page.locator('main [data-day-strip]');

test.describe('doctor Overview through the day', () => {
  test('during hours on an empty day: the whole day on the strip, "until 7 PM", one "Today" card', async ({
    page,
  }) => {
    await signInAsDemoDoctor(page, '2026-10-01T17:00:00+03:00'); // Thursday, 5 PM Cairo
    // The strip runs from the start of the working day, not from now, with the now marker in it.
    await expect(strip(page).getByText('9 AM', { exact: true })).toBeVisible();
    await expect(strip(page).getByText('7 PM', { exact: true })).toBeVisible();
    await expect(strip(page).locator('[data-strip-now]')).toBeVisible();
    // Today's hours are under way: the availability card doesn't advertise the morning.
    await expect(page.getByText('until 7 PM')).toBeVisible();

    // Nothing booked: one "Today" card (ring, "Nothing booked", the next opening) instead of two empty cards.
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
    await expect(page.getByText('Nothing booked', { exact: true })).toBeVisible();
    await expect(page.getByText(/^Next opening: Thu, Oct 1 · /)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upcoming work' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: "Today's Progress" })).toHaveCount(0);
    await expect(page.getByText('Nothing booked for today.')).toHaveCount(0);
    await expect(page.getByText('No one is waiting.')).toBeVisible();

    // No one is waiting, so Start Consultation is unavailable and says why.
    await expect(page.getByRole('button', { name: /Start Consultation/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  test('after hours on a working day: "Today\'s hours have ended" with the next open slot, today "Ended"', async ({
    page,
  }) => {
    await signInAsDemoDoctor(page, '2026-09-30T22:00:00+03:00'); // Wednesday, 10 PM Cairo
    await expect(page.getByText("Today's hours have ended · Next: Thu, Oct 1, 9 AM")).toBeVisible();
    await expect(page.getByText('Set your working hours in Schedule.')).toHaveCount(0);
    // The day is still drawn (past, hatched), and the availability card marks today as over.
    await expect(strip(page)).toBeVisible();
    await expect(page.getByText('Ended', { exact: true })).toBeVisible();
    await expect(page.getByText('No one is waiting.')).toBeVisible();
  });

  test('on a day off: "No working hours today" with the next open slot', async ({ page }) => {
    await signInAsDemoDoctor(page, '2026-10-02T11:00:00+03:00'); // Friday
    await expect(page.getByText('No working hours today')).toBeVisible();
    await expect(page.getByText('Next: Sat, Oct 3, 9 AM')).toBeVisible();
  });
});
