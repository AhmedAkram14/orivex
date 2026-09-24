import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

// Patient Overview audit: the Overview and the Appointments page must agree
// on what "upcoming" means, the page must be accessible with a clean heading
// outline, and it must not scroll sideways on a phone.
test.describe('Patient Overview', () => {
  test('the upcoming count matches the Appointments page Upcoming tab', async ({ page }) => {
    await loginAs(page, 'patient');

    await page.goto('/en/patient');
    const tile = page.getByText('Upcoming appointments', { exact: true }).first().locator('..');
    await expect(tile).toContainText(/\d/);
    const overviewCount = Number((await tile.innerText()).match(/\d+/)?.[0]);

    await page.goto('/en/patient/appointments');
    const upcomingPanel = page.getByRole('tabpanel');
    await expect(upcomingPanel).toBeVisible();
    await page.waitForLoadState('networkidle').catch(() => {});
    const tabCount = await upcomingPanel.locator('[id^="appointment-"]').count();

    expect(tabCount).toBe(overviewCount);
  });

  test('has no serious axe violations and no heading-order violation', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/en/patient');
    await page.locator('main').first().waitFor();
    await page.waitForLoadState('networkidle').catch(() => {});

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'best-practice']).analyze();
    const relevant = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical' || violation.id === 'heading-order' || violation.id === 'page-has-heading-one',
    );
    expect(
      relevant.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`),
    ).toEqual([]);

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('does not scroll sideways at 390px, and reports the page height', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'patient');
    await page.goto('/en/patient');
    await page.locator('main').first().waitFor();
    await page.waitForLoadState('networkidle').catch(() => {});

    const metrics = await page.evaluate(() => {
      const main = document.querySelector('main');
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        contentHeight: main?.scrollHeight ?? document.documentElement.scrollHeight,
      };
    });
    console.log(`patient overview @390px content height: ${metrics.contentHeight}px`);
    testInfo.annotations.push({ type: 'content-height-390', description: `${metrics.contentHeight}px` });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  });
});
