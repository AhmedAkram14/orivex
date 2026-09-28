import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './support/login.js';

// Redesign fix pass (round 2), P0 #1 regression check: the app shell's <main>
// is the only scroll area, so on every authenticated route the document
// itself must never grow taller than the viewport (a visually hidden
// `sr-only` label once escaped the scroll container and added up to ~800px of
// blank page), and <main> must never scroll sideways. Checked at the size the
// review found the bugs at (1046x612, sidebar open) and at a phone width.
const PATIENT_ROUTES = [
  '/patient',
  '/patient/appointments',
  '/patient/doctors',
  '/patient/records',
  '/patient/health',
  '/patient/prescriptions',
  '/notifications',
];
const DOCTOR_ROUTES = [
  '/doctor',
  '/doctor/appointments',
  '/doctor/patients',
  '/doctor/schedule',
  '/doctor/earnings',
  '/doctor/reports',
  '/doctor/profile',
  '/notifications',
];
const VIEWPORTS = [
  { width: 1046, height: 612 },
  { width: 390, height: 844 },
];
const LOCALES = ['en', 'ar'] as const;

async function measure(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      mainScrollWidth: main?.scrollWidth ?? 0,
      mainClientWidth: main?.clientWidth ?? 0,
    };
  });
}

// Each test walks 7-8 routes, so it needs more than the 30s default.
test.describe.configure({ timeout: 240_000 });

for (const role of ['patient', 'doctor'] as const) {
  const routes = role === 'patient' ? PATIENT_ROUTES : DOCTOR_ROUTES;

  test.describe(`${role} shell: document never taller than the viewport, main never scrolls sideways`, () => {
    for (const locale of LOCALES) {
      for (const viewport of VIEWPORTS) {
        test(`${locale} @ ${viewport.width}x${viewport.height}`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await loginAs(page, role);

          for (const path of routes) {
            await page.goto(`/${locale}${path}`);
            await page.locator('main').first().waitFor();
            await page.waitForLoadState('networkidle').catch(() => {});

            const result = await measure(page);
            expect.soft(result.documentHeight, `${path}: document height`).toBeLessThanOrEqual(result.viewportHeight);
            expect.soft(result.mainScrollWidth, `${path}: main horizontal overflow`).toBeLessThanOrEqual(result.mainClientWidth + 1);
          }
        });
      }
    }
  });
}
