import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

// The Schedule page's calendar is a real FullCalendar time grid: these run in
// a real browser (layout, scrolling, clicks) against the MSW-backed build.
test.describe('Doctor Schedule calendar', () => {
  test('renders the time grid with availability bands, and navigation really moves the range', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAs(page, 'doctor');
    await page.goto('/en/doctor/schedule');

    const grid = page.locator('.orivex-fc .fc-timegrid');
    await expect(grid).toBeVisible();
    // Seven day columns with their compact availability summary in the header.
    await expect(page.locator('.orivex-fc .fc-col-header-cell')).toHaveCount(7);
    // Real availability drawn as bands behind the grid.
    await expect(page.locator('.orivex-fc .fc-bg-available').first()).toBeVisible();

    const label = page.locator('[aria-live="polite"]').first();
    const before = await label.innerText();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(label).not.toHaveText(before);
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(label).toHaveText(before);

    await page.screenshot({ path: testInfo.outputPath('schedule-1280.png'), fullPage: true });
    await page.locator('.orivex-fc').screenshot({ path: testInfo.outputPath('calendar-1280.png') });
  });

  test('view tabs switch the calendar view, and a month day opens that day', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAs(page, 'doctor');
    await page.goto('/en/doctor/schedule');
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();

    await page.getByRole('tab', { name: 'Month' }).click();
    await expect(page.locator('.orivex-fc .fc-daygrid')).toBeVisible();

    await page.locator('.orivex-fc .fc-daygrid-day').nth(10).click();
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();
    await expect(page.locator('.orivex-fc .fc-col-header-cell')).toHaveCount(1);
  });

  test('clicking a time slot selects it and offers real actions', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAs(page, 'doctor');
    await page.goto('/en/doctor/schedule');
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();

    // Click where a user would: by position, over whatever band is drawn there
    // (FullCalendar resolves the slot from the pointer coordinates).
    const lane = page.locator('.orivex-fc .fc-timegrid-slot-lane').nth(20);
    await lane.scrollIntoViewIfNeeded();
    const box = await lane.boundingBox();
    if (!box) throw new Error('slot lane has no box');
    await page.mouse.click(box.x + box.width * 0.45, box.y + box.height / 2);
    const bar = page.getByRole('status');
    await expect(bar).toContainText(/AM|PM/);
    await expect(bar.getByRole('button', { name: 'Add time off' })).toBeVisible();
    await bar.getByRole('button', { name: 'Clear selection' }).click();
    await expect(bar).toHaveCount(0);
  });

  test('does not scroll the page sideways at 390px (the calendar scrolls inside its own container)', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'doctor');
    await page.goto('/en/doctor/schedule');
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await page.screenshot({ path: testInfo.outputPath('schedule-390.png') });
  });
});
