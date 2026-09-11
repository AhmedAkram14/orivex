import { expect, test } from '@playwright/test';

// N1 -- Real-stack E2E coverage (ORIVEX Remaining Work Audit). Every other
// spec in this directory drives the app against MSW (NEXT_PUBLIC_ENABLE_
// API_MOCKS=true, see playwright.config.ts's own header comment) -- this
// is the one spec that instead requires NEXT_PUBLIC_ENABLE_API_MOCKS=false
// and a real NestJS backend (with a real seeded Postgres) reachable at
// NEXT_PUBLIC_API_BASE_URL, proving the frontend<->backend<->database seam
// end to end rather than against a mock.
//
// Uses a real seeded demo account (apps/backend/prisma/demo-data/
// demo-people.ts), never the MSW-only mock credentials
// (support/login.ts's MOCK_CREDENTIALS, which do not exist in a real
// database) -- this is why this spec does not reuse `loginAs()`.
//
// Deliberately scoped to login + real-data rendering, not the full
// "login -> book -> pay -> consult -> note" chain named in the original
// audit item: booking a REAL slot needs a genuinely available
// AvailabilityWindow at run time, and unlike every MSW-backed spec (which
// can call `window.__mockScheduling.addDoctorException(...)` to guarantee
// one), there is no equivalent seam against a real backend -- fabricating
// one here would mean either inventing a privileged E2E-only seeding
// endpoint (a real attack-surface/product decision, not "CI infrastructure")
// or accepting the same "today" time-of-day flakiness already tracked as
// N2. Extending this spec to actually book (and, with Stripe/LiveKit
// credentials present, pay/join a consultation) is a real, valuable
// follow-up -- just not one this pass invents a seeding mechanism to reach.
test.describe('Real-stack smoke (real backend, real Postgres)', () => {
  test('logs in with a real seeded account and renders real backend-sourced data', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel('Email').fill('patient01@orivex.dev');
    await page.getByLabel('Password').fill('Password123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Not asserting a specific landing URL here: the real backend's own
    // journey/onboarding-status check (unlike the MSW mock's hardcoded
    // "always fully onboarded" patient) can legitimately route a real
    // seeded account to /patient/intake or /journey first -- that is real
    // product behavior this spec should not fight, only prove login itself
    // succeeded (left /login) before driving straight to the directory,
    // which needs no completed-intake precondition to view.
    await expect(page).not.toHaveURL(/\/en\/login$/);

    await page.goto('/en/patient/doctors');
    await expect(page).toHaveURL(/\/en\/patient\/doctors$/);

    // At least one of the 20 real seeded doctors renders -- proves
    // GET /doctors (public directory) round-tripped through the real
    // backend and real Postgres, not an empty/mocked response.
    await expect(page.getByText('Dr.', { exact: false }).first()).toBeVisible();
  });
});
