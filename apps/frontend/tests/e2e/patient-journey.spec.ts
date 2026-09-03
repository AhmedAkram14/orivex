import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

// Onboarding Redesign (2026-07-21 proposal, Stage O.5). The full
// signup-to-Journey smoke test the proposal's own §14 bullet calls for
// ("Create Account -> Verify Email -> Choose Journey -> Dashboard with zero
// identity check encountered") isn't exercisable against this suite's mock
// architecture: `src/mocks/patient-store.ts`/`doctor-store.ts` are single,
// account-agnostic fixed-profile stores (not keyed by accountId), so a
// freshly-registered mock account cannot honestly report "no profile yet"
// distinct from the seeded `patient@orivex.dev` fixture -- reworking that
// would be a mock-architecture change well beyond this stage's scope. These
// specs instead cover the Journey screen and the two newly-reachable
// Browse screens directly, with the same real routing/accessibility-tree
// rigor as every other spec in this suite.
test.describe('Choose Your Journey', () => {
  test('renders both journey cards and "Practice as a Doctor" routes into the Doctor Onboarding wizard', async ({
    page,
  }) => {
    await loginAs(page, 'patient');

    await page.goto('/en/journey');

    await expect(page.getByRole('heading', { name: "I'm a Patient" })).toBeVisible();
    await expect(page.getByRole('heading', { name: "I'm a Doctor" })).toBeVisible();

    await page.getByRole('button', { name: 'Apply as a Doctor' }).click();
    await expect(page).toHaveURL(/\/en\/doctor\/onboarding$/);
  });
});

test.describe('Browse Doctors and Specialties (Patient Dashboard)', () => {
  test('Browse Doctors is reachable from the dashboard and lists the seeded doctor', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/en/patient');

    // The sidebar nav ("Browse Doctors") differs in capitalization from
    // this dashboard's own lowercase "Browse doctors" links, so `exact`
    // disambiguates those -- but with no upcoming appointment, both
    // `NextAppointmentCard`'s empty-state CTA and `PatientQuickActions`'
    // own tile render an identical "Browse doctors" link to the same
    // /patient/doctors route, so `.first()` picks either safely.
    await page.getByRole('link', { name: 'Browse doctors', exact: true }).first().click();

    await expect(page).toHaveURL(/\/en\/patient\/doctors$/);
    await expect(page.getByText('Dr. Sarah Ahmed')).toBeVisible();
  });

  test('Browse Specialties links into a specialty-filtered doctor list', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/en/patient/specialties');

    await expect(page.getByText('Cardiology')).toBeVisible();
    await page.getByText('Cardiology').click();

    await expect(page).toHaveURL(/\/en\/patient\/doctors\?specialtyId=/);
  });
});
