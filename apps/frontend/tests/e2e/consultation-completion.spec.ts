import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

/**
 * Consultation-completion follow-up (2026-07-26): the real "Complete
 * Consultation is distinct from Leave call" lifecycle -- clinical wrap-up,
 * the patient's post-consultation summary, rating, and the doctor's
 * review-derived rating aggregate actually changing.
 *
 * Two tests, not one combined flow, and this is a disclosed simplification,
 * not an oversight: this E2E environment (like every other spec in this
 * suite) runs MSW's *browser* worker against a real Next.js build, with no
 * real LiveKit server to join/disconnect/reconnect against, and no real
 * backend to keep an Appointment/ConsultationSession/DoctorProfile
 * aggregate consistent across a real doctor-account-login and a real
 * patient-account-login in the same test (each `loginAs` is a real page
 * navigation, which reloads the page's JS and re-seeds every mock store's
 * module-scope state from scratch -- see `mock-provider.tsx`'s own doc
 * comment). So: the doctor-side test seeds a real ConsultationSession
 * in-progress on the queue (`window.__mockDoctorStore`, mirroring
 * `admin-verification-review.spec.ts`'s own precedent for the one
 * genuinely unexercisable slice) and drives Complete Consultation through
 * 100% real clicks and real network calls. The patient-side test seeds a
 * real ConsultationSession's matching Completed appointment
 * (`window.__mockPatientAppointments`) and drives the summary -> rate ->
 * "the doctor's real public rating changes" chain through 100% real clicks
 * and real network calls -- including the aggregate-rating check, verified
 * via the doctor's own public profile page (GET /doctors/:id/reviews is
 * unauthenticated), all within the one continuous patient session, so no
 * second login is needed to observe it.
 */
test.describe('Consultation completion', () => {
  test('doctor documents the visit and completes it -- distinct from leaving the call', async ({ page }) => {
    await loginAs(page, 'doctor');
    await page.waitForFunction(() => window.__mockDoctorStore !== undefined);
    await page.evaluate(() =>
      window.__mockDoctorStore!.seedInConsultationQueueEntry('session-e2e-doctor-1', 'Amina Youssef'),
    );

    await page.getByRole('button', { name: 'Doctor Workspace' }).click();
    await page.getByRole('link', { name: 'Patient Queue' }).click();
    await expect(page).toHaveURL(/\/en\/doctor\/queue$/);

    await expect(page.getByRole('button', { name: 'Join video call' })).toBeVisible();
    await page.getByRole('button', { name: 'Consultation workspace' }).click();

    await expect(page.getByRole('heading', { name: 'Consultation workspace' })).toBeVisible();

    await page.getByPlaceholder('Add a clinical note...').fill('Patient reports symptom improvement.');
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(page.getByText('Patient reports symptom improvement.')).toBeVisible();

    // No unsaved input left -- Complete Consultation proceeds without the
    // "unsaved work" browser confirm, since the note was already saved.
    await page.getByRole('button', { name: 'Complete Consultation' }).click();

    await expect(page.getByRole('heading', { name: 'Consultation workspace' })).not.toBeVisible();
  });

  test('patient sees the completed visit, rates it, and the doctor\'s public rating changes accordingly', async ({
    page,
  }) => {
    await loginAs(page, 'patient');
    await page.waitForFunction(() => window.__mockPatientAppointments !== undefined);
    await page.evaluate(() =>
      window.__mockPatientAppointments!.seedCompletedAppointment('session-e2e-patient-1', {
        name: 'Dr. Sarah Ahmed',
        specialty: 'Cardiology',
      }),
    );

    await page.getByRole('button', { name: 'My Health' }).click();
    await page.getByRole('link', { name: 'Appointments' }).click();
    await expect(page).toHaveURL(/\/en\/patient\/appointments$/);

    await page.getByRole('tab', { name: 'History' }).click();
    await page.getByRole('button', { name: 'View summary' }).click();

    const summaryDialog = page.getByRole('dialog', { name: 'Consultation summary' });
    await expect(summaryDialog.getByRole('heading', { name: 'Consultation summary' })).toBeVisible();
    await expect(summaryDialog.getByText('Dr. Sarah Ahmed', { exact: true })).toBeVisible();
    await expect(summaryDialog.getByText('Completed')).toBeVisible();

    await page.getByRole('radio', { name: '5 of 5 stars' }).click();
    await page.getByPlaceholder('Leave an optional comment...').fill('Very attentive and thorough.');
    await page.getByRole('button', { name: 'Submit rating' }).click();

    await expect(page.getByText('You rated this consultation 5 of 5.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    // Client-side navigation only from here on -- a `page.goto` would
    // reload the page's JS and wipe the in-memory review just submitted.
    // "My Health" is already expanded from the earlier "Appointments" click,
    // so this link is already reachable without toggling the group again.
    await page.getByRole('link', { name: 'Browse Doctors' }).click();
    await expect(page).toHaveURL(/\/en\/patient\/doctors$/);

    await page.getByRole('link').filter({ hasText: 'Dr. Sarah Ahmed' }).click();
    await expect(page).toHaveURL(/\/en\/patient\/doctors\/doctor-profile-1$/);

    await expect(page.getByText('(1 reviews)')).toBeVisible();
    await expect(page.getByText('Very attentive and thorough.')).toBeVisible();
  });
});
