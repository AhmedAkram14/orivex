import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
// real Admin Verification Experience -- 100% real clicks against the real
// admin queue and case-detail pages, real (MSW-backed) network calls for
// every read and every decision. Persistence is proven by navigating away
// to the queue (a real, separate `GET /admin/verification-queue` fetch) and
// back, never by `page.reload()`/`page.goto()` to a URL directly -- this
// app's E2E environment is MSW's *browser* worker, whose in-memory store
// lives in the page's own JS heap (see `mock-provider.tsx`); a hard
// navigation tears that down and re-seeds from scratch, same as restarting
// a real backend process would wipe an in-memory (non-persisted) store. The
// one disclosed simplification: seeding "a doctor has already submitted
// their professional verification" uses
// `window.__mockDoctorStore.submitVerification` (the mocks-only test seam
// `identity-verification.spec.ts` already established the same pattern for)
// rather than re-driving the full Doctor Onboarding wizard in this spec --
// that submission flow is already covered end-to-end by
// `onboarding-flow.test.tsx`. Everything downstream of that seed (queue,
// filters, case detail, document inspection, decide/suspend) is real
// application code, not simulated.
test.describe('Admin verification review', () => {
  test('reviews a doctor case end-to-end: queue -> filter -> real case detail -> real documents -> Approve, persisted after reload', async ({
    page,
  }) => {
    await loginAs(page, 'admin');
    await page.waitForFunction(() => window.__mockDoctorStore !== undefined);
    await page.evaluate(() => {
      window.__mockDoctorStore!.submitVerification('doctor-profile-1', {
        licenseNumber: 'LIC-9001',
        specialtyCode: 'cardiology',
        documentAssetIds: ['seed-national-id-front'],
      });
    });

    // The "Admin Workspace" nav group is a plain always-expanded heading
    // now, not a disclosure toggle (see NavGroup's own comment), so
    // "Verification Queue" is already visible with no click needed first.
    await page.getByRole('link', { name: 'Verification Queue' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/verification-queue$/);

    await expect(page.getByText('Dr. Sarah Ahmed')).toBeVisible();

    // Server-side filter, not a client-side one.
    await page.getByRole('combobox', { name: 'Filter by type' }).click();
    await page.getByRole('option', { name: 'Patient' }).click();
    await expect(page.getByText('Dr. Sarah Ahmed')).not.toBeVisible();

    await page.getByRole('combobox', { name: 'Filter by type' }).click();
    await page.getByRole('option', { name: 'Doctor' }).click();
    await expect(page.getByText('Dr. Sarah Ahmed')).toBeVisible();

    // The Doctor-filtered queue now seeds more than one pending case (a
    // busy-queue mock, same "not empty by default" pattern as
    // doctor-store.ts's own schedule/queue seeds), so scope to this case's
    // own table row rather than the page's only "View case" link.
    await page.getByRole('row', { name: /Dr\. Sarah Ahmed/ }).getByRole('link', { name: 'View case' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/verification-queue\/.+/);

    // Applicant section: real resolved account identity.
    await expect(page.getByText('doctor@orivex.dev')).toBeVisible();
    // Professional information: real doctor-profile fields, not invented.
    await expect(page.getByText('LIC-9001')).toBeVisible();
    await expect(page.getByText('Cardiology')).toBeVisible();
    // Documents: a real, signed (never raw/public) preview URL.
    const document = page.locator('img[alt="National ID (front)"]');
    await expect(document).toBeVisible();
    await expect(document).toHaveAttribute('src', /\/mock-object-storage\/seed-national-id-front/);

    // Phase 4 (Notification & Admin Polish): Approve now opens the same
    // confirm Dialog as Reject/Suspend/Request More Info -- the first click
    // only opens it, the dialog's own "Approve" button (same label, scoped
    // to the dialog) actually confirms.
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Approve this verification?')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();

    await expect(page.getByRole('button', { name: 'Suspend' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).not.toBeVisible();

    // Prove persistence through a genuinely separate read (a fresh
    // `GET /admin/verification-queue?status=approved`), not just the same
    // component's own optimistic cache -- navigate away via a real link,
    // then back.
    await page.getByRole('link', { name: 'Verification Queue' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/verification-queue$/);
    // Both filters: the seeded demo patient case is also already Approved,
    // so status alone isn't enough to isolate this one doctor case.
    await page.getByRole('combobox', { name: 'Filter by type' }).click();
    await page.getByRole('option', { name: 'Doctor' }).click();
    await page.getByRole('combobox', { name: 'Filter by status' }).click();
    await page.getByRole('option', { name: 'Approved' }).click();
    await expect(page.getByText('Dr. Sarah Ahmed')).toBeVisible();

    // The Doctor+Approved-filtered queue can still hold more than one
    // matching case (see the earlier scope-to-row comment).
    await page.getByRole('row', { name: /Dr\. Sarah Ahmed/ }).getByRole('link', { name: 'View case' }).click();
    await expect(page.getByRole('button', { name: 'Suspend' })).toBeVisible();
    await expect(page.getByText('Approved').first()).toBeVisible();
  });

  test('rejects a doctor case with a required reason, visible in Verification Information and History', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.waitForFunction(() => window.__mockDoctorStore !== undefined);
    await page.evaluate(() => {
      window.__mockDoctorStore!.submitVerification('doctor-profile-1', {
        licenseNumber: 'LIC-9002',
        specialtyCode: 'dermatology',
        documentAssetIds: ['seed-national-id-front'],
      });
    });

    // The "Admin Workspace" nav group is a plain always-expanded heading
    // now, not a disclosure toggle (see NavGroup's own comment), so
    // "Verification Queue" is already visible with no click needed first.
    await page.getByRole('link', { name: 'Verification Queue' }).click();
    // Scope to this case's own row -- the queue seeds more than one
    // pending case by default (see the earlier test's own comment).
    await page.getByRole('row', { name: /Dr\. Sarah Ahmed/ }).getByRole('link', { name: 'View case' }).click();

    await page.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByText('Reject this application?')).toBeVisible();
    const confirmReject = page.getByRole('dialog').getByRole('button', { name: 'Reject' });
    await expect(confirmReject).toBeDisabled();

    await page.getByLabel('Reason').fill('The submitted license photo was unreadable.');
    await expect(confirmReject).toBeEnabled();
    await confirmReject.click();

    await expect(page.getByText('The submitted license photo was unreadable.').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).not.toBeVisible();

    // Prove persistence via a genuinely separate read, not just this same
    // component's own state: navigate away to the queue (status=Rejected)
    // and back.
    await page.getByRole('link', { name: 'Verification Queue' }).click();
    await page.getByRole('combobox', { name: 'Filter by status' }).click();
    await page.getByRole('option', { name: 'Rejected' }).click();
    await expect(page.getByText('Dr. Sarah Ahmed')).toBeVisible();
    // The Rejected-filtered queue can still hold more than one matching
    // case (see the earlier scope-to-row comment).
    await page.getByRole('row', { name: /Dr\. Sarah Ahmed/ }).getByRole('link', { name: 'View case' }).click();
    await expect(page.getByText('The submitted license photo was unreadable.').first()).toBeVisible();
  });

  test('suspends an already-Approved case with a required reason (no automatic role demotion -- flagged, admin decision only)', async ({
    page,
  }) => {
    await loginAs(page, 'admin');
    await page.waitForFunction(() => window.__mockDoctorStore !== undefined);
    await page.evaluate(() => {
      window.__mockDoctorStore!.submitVerification('doctor-profile-1', {
        licenseNumber: 'LIC-9003',
        specialtyCode: 'cardiology',
        documentAssetIds: ['seed-national-id-front'],
      });
    });

    // The "Admin Workspace" nav group is a plain always-expanded heading
    // now, not a disclosure toggle (see NavGroup's own comment), so
    // "Verification Queue" is already visible with no click needed first.
    await page.getByRole('link', { name: 'Verification Queue' }).click();
    // Scope to this case's own row -- the queue seeds more than one
    // pending case by default (see the first test's own comment).
    await page.getByRole('row', { name: /Dr\. Sarah Ahmed/ }).getByRole('link', { name: 'View case' }).click();
    // Phase 4 (Notification & Admin Polish): Approve opens a confirm Dialog
    // now, same as Reject/Suspend/Request More Info.
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Approve this verification?')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByRole('button', { name: 'Suspend' })).toBeVisible();

    await page.getByRole('button', { name: 'Suspend' }).click();
    await expect(page.getByText('Suspend this verification?')).toBeVisible();
    const confirmSuspend = page.getByRole('dialog').getByRole('button', { name: 'Suspend' });
    await expect(confirmSuspend).toBeDisabled();

    await page.getByLabel('Reason').fill('Reported license irregularity under review.');
    await confirmSuspend.click();

    await expect(page.getByText('Reported license irregularity under review.').first()).toBeVisible();
    // No further decide/suspend action remains available once Suspended.
    await expect(page.getByRole('button', { name: 'Approve' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Suspend' })).not.toBeVisible();
  });
});
