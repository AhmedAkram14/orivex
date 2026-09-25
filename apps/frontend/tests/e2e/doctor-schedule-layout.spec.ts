import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

// Layout checks for the redesigned Schedule page at the widths that matter,
// in English and Arabic (right to left), with a screenshot of each.
const CASES = [
  { locale: 'en', width: 1536, height: 1000 },
  { locale: 'en', width: 1280, height: 1000 },
  { locale: 'en', width: 1150, height: 1000 },
  { locale: 'en', width: 390, height: 844 },
  { locale: 'ar', width: 1280, height: 1000 },
  { locale: 'ar', width: 390, height: 844 },
] as const;

for (const { locale, width, height } of CASES) {
  test(`${locale} @ ${width}px: no sideways page scroll, chips stay on one line, layout matches breakpoint`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await loginAs(page, 'doctor');
    await page.goto(`/${locale}/doctor/schedule`);
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Direction follows the locale.
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');

    // Working-span chips never wrap (one line high).
    if (width >= 768) {
      const chips = page.locator('.orivex-fc .fc-dayheader-chip');
      const count = await chips.count();
      for (let i = 0; i < count; i += 1) {
        const box = await chips.nth(i).boundingBox();
        expect(box?.height ?? 0, `chip ${i} wraps`).toBeLessThanOrEqual(24);
      }
    }

    // xl and up: the summary column sits beside the calendar, starting level
    // with the title. Below xl it stacks under the calendar.
    const summary = page.getByRole('heading', { name: /This Week|هذا الأسبوع/ });
    const title = page.getByRole('heading', { level: 1 });
    const calendar = page.locator('.orivex-fc').first();
    const [summaryBox, titleBox, calendarBox] = await Promise.all([summary.boundingBox(), title.boundingBox(), calendar.boundingBox()]);
    if (width >= 1280) {
      expect(summaryBox!.y).toBeLessThan(calendarBox!.y);
      expect(Math.abs(summaryBox!.y - titleBox!.y)).toBeLessThan(140);
      expect(summaryBox!.x).toBeGreaterThan(calendarBox!.x + calendarBox!.width - 5 - (locale === 'ar' ? 10000 : 0));
    } else {
      expect(summaryBox!.y).toBeGreaterThan(calendarBox!.y + calendarBox!.height - 5);
    }

    // The appointment accent bar sits on the inline-start edge.
    const appt = page.locator('.orivex-fc .fc-appt').first();
    if (await appt.count()) {
      const border = await appt.evaluate((el) => {
        const style = getComputedStyle(el);
        return { left: style.borderLeftWidth, right: style.borderRightWidth };
      });
      if (locale === 'ar') {
        expect(border.right).toBe('3px');
        expect(border.left).toBe('0px');
      } else {
        expect(border.left).toBe('3px');
        expect(border.right).toBe('0px');
      }
    }

    // Week by default from md up, Day below it (the mobile default).
    const expectedTab = width >= 768 ? /Week|أسبوع/ : /Day|يوم/;
    await expect(page.getByRole('tab', { name: expectedTab })).toHaveAttribute('data-state', 'active');

    // A taller viewport (same width) instead of `fullPage`: Playwright's full-page
    // capture resizes the window in a way that trips the one-time mobile-default
    // rule and flips the view to Day mid-screenshot.
    await page.setViewportSize({ width, height: 1500 });
    await page.screenshot({ path: testInfo.outputPath(`schedule-${locale}-${width}.png`) });
  });
}
