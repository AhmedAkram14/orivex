import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

// Doctor UX audit remediation, Phases 7 + 8: every route the audit named for
// horizontal-overflow problems, checked at the three audited widths in both
// locales, plus an axe pass over the doctor routes. Runs against the same
// MSW-backed build every other spec here uses (see playwright.config.ts).
const ROUTES = [
  { name: 'overview', path: '/doctor' },
  { name: 'patients', path: '/doctor/patients' },
  { name: 'schedule', path: '/doctor/schedule' },
  { name: 'messages', path: '/doctor/messages' },
  { name: 'notifications', path: '/notifications' },
  { name: 'appointments', path: '/doctor/appointments' },
  { name: 'reports', path: '/doctor/reports' },
];
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
];
const LOCALES = ['en', 'ar'] as const;

test.describe('Doctor routes: no horizontal page scroll', () => {
  for (const locale of LOCALES) {
    for (const viewport of VIEWPORTS) {
      test(`${locale} @ ${viewport.width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await loginAs(page, 'doctor');

        for (const route of ROUTES) {
          await page.goto(`/${locale}${route.path}`);
          await page.locator('main').first().waitFor();
          // Let data-driven content settle so late-rendering tables/cards are measured.
          await page.waitForLoadState('networkidle').catch(() => {});

          const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }));
          const offenders =
            scrollWidth > clientWidth
              ? await page.evaluate((limit) => {
                  return Array.from(document.body.querySelectorAll<HTMLElement>('*'))
                    .filter((el) => el.getBoundingClientRect().right > limit + 0.5)
                    .slice(0, 6)
                    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} right=${Math.round(el.getBoundingClientRect().right)}`);
                }, clientWidth)
              : [];
          expect(
            scrollWidth,
            `${route.name} overflows horizontally at ${viewport.width}px (${locale}); offenders: ${offenders.join(' || ')}`,
          ).toBeLessThanOrEqual(clientWidth);

          await page.screenshot({
            path: testInfo.outputPath(`${locale}-${viewport.width}-${route.name}.png`),
            fullPage: true,
          });
        }
      });
    }
  }
});

test.describe('Doctor routes: axe', () => {
  for (const route of ROUTES) {
    test(`${route.name} has no serious or critical axe violations`, async ({ page }) => {
      await loginAs(page, 'doctor');
      await page.goto(`/en${route.path}`);
      await page.locator('main').first().waitFor();
      await page.waitForLoadState('networkidle').catch(() => {});

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
      expect(
        blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => `${node.target.join(" ")} [${(node.any[0]?.message ?? "").slice(0, 110)}]`).join(" | ")}`),
        `axe violations on ${route.name}`,
      ).toEqual([]);
    });
  }

  // The hours grid scrolls inside the calendar. In a week with no appointments
  // it holds nothing focusable, which is where axe's scrollable-region rule bites.
  test('schedule week with no appointments (scrolling hours grid) has no serious or critical axe violations', async ({ page }) => {
    await loginAs(page, 'doctor');
    await page.goto('/en/doctor/schedule');
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();
    for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page.locator('.orivex-fc .fc-appt')).toHaveCount(0);

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(blocking.map((violation) => violation.id)).toEqual([]);
  });
});
