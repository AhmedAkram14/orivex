import { expect, test, type Page } from '@playwright/test';

// The doctor Overview's day strip must say WHY it is empty, from the doctor's real schedule, and the rest of the
// Overview stays quiet (one line per card, no second illustrated empty state). The demo doctor Dr. Omar Hassan
// (src/mocks/demo-data) works 9 AM - 7 PM, Friday off, and has nothing booked on these days.
async function signInAsDemoDoctor(page: Page, at: string) {
  // Fixes Date for the page and the in-browser mock backend alike; timers keep running.
  await page.clock.setFixedTime(new Date(at));
  await page.goto('/en/login');
  await page.getByLabel('Email').fill('doctor01@orivex.dev');
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/doctor$/);
}

test.describe('doctor Overview outside working hours', () => {
  test('after hours on a working day: "Today\'s hours have ended" with the next open slot', async ({ page }) => {
    await signInAsDemoDoctor(page, '2026-09-30T22:00:00+03:00'); // Wednesday, 10 PM Cairo
    await expect(page.getByText("Today's hours have ended")).toBeVisible();
    await expect(page.getByText('Next: Thu, Oct 1, 9 AM')).toBeVisible();
    await expect(page.getByText('Set your working hours in Schedule.')).toHaveCount(0);

    // The other cards are single quiet lines.
    await expect(page.getByText('Nothing booked for today.')).toBeVisible();
    await expect(page.getByText('No one is waiting.')).toBeVisible();
    await expect(page.getByText('No appointments to track today.')).toBeVisible();
  });

  test('on a day off: "No working hours today" with the next open slot', async ({ page }) => {
    await signInAsDemoDoctor(page, '2026-10-02T11:00:00+03:00'); // Friday
    await expect(page.getByText('No working hours today')).toBeVisible();
    await expect(page.getByText('Next: Sat, Oct 3, 9 AM')).toBeVisible();
  });
});
