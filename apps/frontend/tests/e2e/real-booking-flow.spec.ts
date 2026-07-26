import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

/** Matches `resolve-day.ts`'s own local-date `toDateKey` format exactly. */
function todayDateKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Integration-gap closure (2026-07-25): the real, end-to-end production
// booking journey this stage's audit found missing --
// directory -> profile -> real backend availability -> POST /appointments,
// with the identity-verification gate triggered by the real endpoint and
// `returnTo` safely resuming the booking after verification. Uses the
// mocks-only `window.__mockScheduling` seam to guarantee a bookable slot
// "today" (an `extra-hours` exception) regardless of which real weekday
// this suite happens to run on, and `window.__mockPatientVerification` to
// simulate the never-verified -> submitted -> approved lifecycle, same as
// `identity-verification.spec.ts`.
test.describe('Real appointment booking flow', () => {
  test('books a real appointment from the doctor directory, through the identity-verification gate, into Patient Appointments', async ({
    page,
  }) => {
    await loginAs(page, 'patient');
    await page.waitForFunction(() => window.__mockPatientVerification !== undefined && window.__mockScheduling !== undefined);
    await page.evaluate(() => window.__mockPatientVerification!.setPatientVerified(false));
    await page.evaluate(
      (date) =>
        window.__mockScheduling!.addDoctorException({ date, type: 'extra-hours', hours: { start: '00:00', end: '23:30' } }),
      todayDateKey(),
    );

    // Directory -> profile -> real "Book appointment" CTA.
    await page.getByRole('button', { name: 'My Health' }).click();
    await page.getByRole('link', { name: 'Browse Doctors', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/patient\/doctors$/);

    await page.getByText('Dr. Sarah Ahmed').click();
    await expect(page).toHaveURL(/\/en\/patient\/doctors\/.+/);

    await page.getByRole('link', { name: 'Book appointment' }).click();
    await expect(page).toHaveURL(/\/en\/patient\/appointments\/book\?doctorId=/);

    // Real backend-materialized slot, real POST /appointments -> blocked by
    // the real identity-verification guard. Scoped to <main> so the shell's
    // own header buttons (search, notifications, avatar) are never mistaken
    // for a slot.
    const main = page.getByRole('main');
    const excludedNames = ['Today', 'Previous day', 'Next day'];
    await expect(async () => {
      const buttons = await main.getByRole('button').all();
      let found = false;
      for (const button of buttons) {
        const name = (await button.getAttribute('aria-label')) ?? (await button.textContent()) ?? '';
        if (!excludedNames.includes(name.trim())) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    }).toPass({ timeout: 10_000 });

    async function clickFirstSlot() {
      const buttons = await main.getByRole('button').all();
      for (const button of buttons) {
        const name = (await button.getAttribute('aria-label')) ?? (await button.textContent()) ?? '';
        if (!excludedNames.includes(name.trim())) {
          await button.click();
          return;
        }
      }
      throw new Error('No slot button found');
    }

    await clickFirstSlot();
    await expect(page.getByText('Review')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page.getByText('Verify your identity to book an appointment')).toBeVisible();
    const bookUrl = page.url();

    await page.getByRole('link', { name: 'Start verification' }).click();
    await expect(page).toHaveURL(/\/en\/patient\/verify-identity\?returnTo=/);

    for (const label of ['National ID (front)', 'National ID (back)', 'Selfie with ID']) {
      const slot = page.locator('li', { hasText: label });
      const chooserPromise = page.waitForEvent('filechooser');
      await slot.getByRole('button', { name: 'Upload' }).click();
      const chooser = await chooserPromise;
      await chooser.setFiles({ name: `${label}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from('id-photo') });
      await expect(slot.getByText(`${label}.jpg`)).toBeVisible();
    }

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('3 documents')).toBeVisible();
    await page.getByRole('button', { name: 'Submit for verification' }).click();
    await expect(page.getByText('Submitted')).toBeVisible();

    await page.evaluate(() => {
      window.__mockPatientVerification!.approveMyLatestVerification();
      window.__queryClient!.invalidateQueries();
    });

    await expect(page.getByText('Approved')).toBeVisible();
    await page.getByRole('link', { name: 'Continue' }).click();

    // returnTo safely resumed the exact booking context (same doctorId).
    await expect(page).toHaveURL(bookUrl);

    // Now verified -- the same real booking completes for real.
    await clickFirstSlot();
    await expect(page.getByText('Review')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page).toHaveURL(/\/en\/patient\/appointments$/);
    await expect(page.getByText('Dr. Sarah Ahmed')).toBeVisible();
  });
});
