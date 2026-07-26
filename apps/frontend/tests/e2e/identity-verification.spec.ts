import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

// Onboarding Redesign (2026-07-21 proposal, Stage O.7): the full
// gated-action -> "Verify your identity to continue" -> wizard -> Approved
// -> automatic return-to-original-action loop (§7a). The seeded
// `patient@orivex.dev` account is already Approved by default (matching
// `doctor-store.ts`'s own "already-provisioned demo account" precedent, so
// every *other* gated-action spec keeps working unmodified) -- this spec
// uses the mocks-only `window.__mockPatientVerification` test seam
// (`shared/providers/mock-provider.tsx`) to simulate "never verified," then
// later "an admin approved the submission," since no real
// AdministrationModule review screen for patients exists yet to drive that
// second step through the UI, plus `window.__queryClient` (`query-
// provider.tsx`) to force a refetch after that simulated approval without a
// real page reload -- a reload would re-run every mock store's module-scope
// seed, wiping the very state the test just set up (in-memory, client-side
// MSW state doesn't survive a real navigation the way a real backend
// would). Everything else -- the gate, the 3-document upload, the
// review/submit, and the `returnTo` redirect back to Medical Records -- goes
// through real clicks, real client-side routing, and real (MSW-backed)
// network calls.
test.describe('Patient identity verification gate', () => {
  test('blocks a clinical document upload until verified, then returns automatically once approved', async ({
    page,
  }) => {
    await loginAs(page, 'patient');
    await page.waitForFunction(() => window.__mockPatientVerification !== undefined);
    await page.evaluate(() => window.__mockPatientVerification!.setPatientVerified(false));

    // A client-side Link click, not `page.goto` -- a real navigation would
    // reload the page's JS and re-seed the mock store, undoing the
    // `setPatientVerified(false)` call above. "Medical Records" sits inside
    // the collapsible "My Health" nav group, so that has to expand first.
    await page.getByRole('button', { name: 'My Health' }).click();
    await page.getByRole('link', { name: 'Medical Records' }).click();
    await expect(page).toHaveURL(/\/en\/patient\/records$/);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload' }).click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('report') });

    await expect(page.getByText('Verify your identity to upload documents')).toBeVisible();

    await page.getByRole('link', { name: 'Start verification' }).click();
    await expect(page).toHaveURL(/\/en\/patient\/verify-identity\?returnTo=/);

    for (const label of ['National ID (front)', 'National ID (back)', 'Selfie with ID']) {
      const slot = page.locator('li', { hasText: label });
      const slotChooserPromise = page.waitForEvent('filechooser');
      await slot.getByRole('button', { name: 'Upload' }).click();
      const slotChooser = await slotChooserPromise;
      await slotChooser.setFiles({
        name: `${label}.jpg`,
        mimeType: 'image/jpeg',
        buffer: Buffer.from('id-photo'),
      });
      await expect(slot.getByText(`${label}.jpg`)).toBeVisible();
    }

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('3 documents')).toBeVisible();

    await page.getByRole('button', { name: 'Submit for verification' }).click();
    await expect(page.getByText('Submitted')).toBeVisible();

    // Simulates the admin decision Stage O.7 has no patient-facing review
    // screen for yet (disclosed gap, same as this file's header comment),
    // then forces the already-mounted verification-status query to refetch
    // so the UI reflects it without a page reload.
    await page.evaluate(() => {
      window.__mockPatientVerification!.approveMyLatestVerification();
      window.__queryClient!.invalidateQueries();
    });

    await expect(page.getByText('Approved')).toBeVisible();
    const continueLink = page.getByRole('link', { name: 'Continue' });
    await expect(continueLink).toBeVisible();
    await continueLink.click();

    await expect(page).toHaveURL(/\/en\/patient\/records$/);
  });

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
  // proves the Approved -> Suspended consequence (§9) -- an admin suspending
  // an already-Approved case must re-block the same O.4 gated actions this
  // spec's first test proves unlock on Approve. `suspendMyLatestVerification`
  // calls the exact same `suspendVerificationCase` function the real admin
  // Suspend button (see `admin-verification-review.spec.ts`) calls; only the
  // "an admin, in a separate session, clicked Suspend" step is simulated
  // (this mocks-only browser architecture has no way to hold two different
  // logged-in roles in one page session at once -- disclosed, same
  // limitation this file's own header comment already documents for the
  // Approve direction).
  test('re-blocks a gated action once an already-Approved verification is suspended', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.waitForFunction(() => window.__mockPatientVerification !== undefined);

    // The seeded account is already Approved by default -- confirm the
    // status screen agrees before suspending it.
    await page.getByRole('button', { name: 'My Health' }).click();
    await page.getByRole('link', { name: 'Medical Records' }).click();
    await expect(page).toHaveURL(/\/en\/patient\/records$/);

    await page.evaluate(() => {
      window.__mockPatientVerification!.suspendMyLatestVerification('Reported document irregularity under review.');
      window.__queryClient!.invalidateQueries();
    });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload' }).click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('report') });

    await expect(page.getByText('Verify your identity to upload documents')).toBeVisible();

    await page.getByRole('link', { name: 'Start verification' }).click();
    await expect(page.getByText('Suspended').first()).toBeVisible();
    await expect(page.getByText('Your verification has been suspended. Please contact support for details.')).toBeVisible();
  });
});
