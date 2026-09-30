import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './support/login.js';

// Polish pass (round 4): one avatar size scale, paired to the text beside it (shared/ui/avatar.tsx). Every avatar
// on screen must render at one of the scale's sizes, as a circle, and every photo in one must use the face-biased
// crop -- so similar-size circles show similar-size faces.
const SIZES = [24, 32, 40, 56, 96];
const FACE_CROP = '50% 22%';

const PATIENT_ROUTES = ['/patient', '/patient/doctors', '/patient/appointments', '/patient/profile', '/patient/messages'];
const DOCTOR_ROUTES = ['/doctor', '/doctor/appointments', '/doctor/patients', '/doctor/queue', '/doctor/profile', '/doctor/schedule', 'CHART'];
const LOCALES = ['en', 'ar'] as const;

async function measureAvatars(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-slot="avatar"]')]
      .map((avatar) => {
        const box = avatar.getBoundingClientRect();
        const images = [...avatar.querySelectorAll('img')].map((image) => getComputedStyle(image).objectPosition);
        return { width: Math.round(box.width), height: Math.round(box.height), images, size: avatar.dataset.size };
      })
      // Hidden ones (e.g. a calendar chip's avatar dropped in a narrow day cell) aren't on screen.
      .filter((avatar) => avatar.width > 0),
  );
}

async function checkPage(page: Page, label: string) {
  await page.locator('main').first().waitFor();
  await page.waitForLoadState('networkidle').catch(() => {});
  const avatars = await measureAvatars(page);
  for (const [index, avatar] of avatars.entries()) {
    expect.soft(SIZES, `${label}: avatar ${index} (${avatar.size}) is ${avatar.width}px`).toContain(avatar.width);
    expect.soft(avatar.height, `${label}: avatar ${index} is square`).toBe(avatar.width);
    for (const position of avatar.images) {
      expect.soft(position, `${label}: avatar ${index} photo crop`).toBe(FACE_CROP);
    }
  }
  return avatars.length;
}

test.describe.configure({ timeout: 240_000 });

test.describe('avatars: one size scale and a face-biased crop', () => {
  for (const locale of LOCALES) {
    test(`landing (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle').catch(() => {});
      await checkPage(page, `/${locale}`);
    });

    for (const role of ['patient', 'doctor'] as const) {
      test(`${role} (${locale})`, async ({ page }) => {
        await page.setViewportSize({ width: 1046, height: 612 });
        await loginAs(page, role);
        let seen = 0;
        for (const route of role === 'patient' ? PATIENT_ROUTES : DOCTOR_ROUTES) {
          let path = route;
          if (route === 'CHART') {
            await page.goto(`/${locale}/doctor/patients`);
            await page.locator('main a[href*="/doctor/patients/"]').first().waitFor();
            path = ((await page.locator('main a[href*="/doctor/patients/"]').first().getAttribute('href')) ?? '').replace(`/${locale}`, '');
          }
          await page.goto(`/${locale}${path}`);
          seen += await checkPage(page, `/${locale}${path}`);
        }
        // The walk must actually meet avatars, or it proves nothing.
        expect(seen).toBeGreaterThan(5);
      });
    }
  }
});
