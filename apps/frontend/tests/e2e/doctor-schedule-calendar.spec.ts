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
    // Days off are drawn grey; working hours are plain white (no green fill).
    await expect(page.locator('.orivex-fc .fc-bg-off').first()).toBeVisible();
    await expect(page.locator('.orivex-fc .fc-bg-available')).toHaveCount(0);
    // The colour key is gone.
    await expect(page.getByText('Booked', { exact: true })).toHaveCount(0);
    // The hours scroll inside the calendar (it does not grow the page).
    const scroller = page.locator('.orivex-fc-scrollbox');
    const { scrollable, hasRoom } = await scroller.evaluate((el) => ({
      scrollable: el.scrollHeight - el.clientHeight,
      hasRoom: el.clientHeight > 300,
    }));
    expect(scrollable).toBeGreaterThan(50);
    expect(hasRoom).toBe(true);
    // The whole calendar card fits in the window (no need to scroll the page to see its bottom edge).
    const card = await scroller.boundingBox();
    expect(card!.y + card!.height).toBeLessThanOrEqual(900);

    const label = page.locator('[aria-live="polite"]').first();
    const before = await label.innerText();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(label).not.toHaveText(before);
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(label).toHaveText(before);

    await page.screenshot({ path: testInfo.outputPath('schedule-1280.png'), fullPage: true });
    await page.locator('.orivex-fc').screenshot({ path: testInfo.outputPath('calendar-1280.png') });
  });

  test('week view hour cells are roomy and roughly square (an hour is about as tall as a day is wide)', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAs(page, 'doctor');
    await page.goto('/en/doctor/schedule');
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();

    // Two 30-minute slot rows make one hour; a day column is one of seven header cells.
    const slots = page.locator('.orivex-fc .fc-timegrid-slot-lane');
    const first = await slots.nth(0).boundingBox();
    const second = await slots.nth(1).boundingBox();
    const column = await page.locator('.orivex-fc .fc-col-header-cell').nth(1).boundingBox();
    if (!first || !second || !column) throw new Error('grid has no boxes');
    const hour = first.height + second.height;

    // Never cramped (>= 64px) and never absurdly tall (<= 112px) ...
    expect(hour).toBeGreaterThanOrEqual(63);
    expect(hour).toBeLessThanOrEqual(113);
    // ... and close to square: within a quarter of the column width, unless clamped.
    const target = Math.min(112, Math.max(64, column.width));
    expect(Math.abs(hour - target)).toBeLessThanOrEqual(target * 0.15);

    await page.locator('.orivex-fc').screenshot({ path: testInfo.outputPath('week-cells.png') });
  });

  test('week view scrolls vertically inside the calendar while the day header stays put', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAs(page, 'doctor');
    await page.goto('/en/doctor/schedule');
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();

    const scroller = page.locator('.orivex-fc-scrollbox');
    const header = page.locator('.orivex-fc .fc-col-header-cell').first();
    const pageHeightBefore = await page.evaluate(() => document.documentElement.scrollHeight);

    // It opens around the current time, not at the very top of the day: the
    // mock doctor's day is 8-19, so from mid-morning on the first hour is scrolled away.
    const cairoHour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Cairo' }).format(new Date()));
    if (cairoHour >= 10 && cairoHour < 19) {
      await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    }
    const headerTop = (await header.boundingBox())!.y;

    // Scrolling moves the hours but neither the page nor the day header.
    await scroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect(page.getByText('8 AM', { exact: true })).toBeInViewport();
    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.getByText('6 PM', { exact: true })).toBeInViewport();
    await expect(page.getByText('8 AM', { exact: true })).not.toBeInViewport();
    // (within a pixel or two: the sticky header sits on the table's own border)
    expect(Math.abs((await header.boundingBox())!.y - headerTop)).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(pageHeightBefore);

    // Keyboard users can reach the scroll box by name.
    await expect(scroller).toHaveAttribute('tabindex', '0');
    await expect(page.getByRole('region', { name: 'Schedule hours' })).toBeVisible();

    // A real mouse wheel over the grid scrolls it too.
    await scroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    const box = (await scroller.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
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

  test('month view: status legend, today underline, and an appointment chip opens its details card', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await loginAs(page, 'doctor');
    await page.goto('/en/doctor/schedule');
    await expect(page.locator('.orivex-fc .fc-timegrid')).toBeVisible();

    await page.getByRole('tab', { name: 'Month' }).click();
    await expect(page.locator('.orivex-fc .fc-daygrid')).toBeVisible();

    // Month header with today's date, and the colour key under the calendar.
    await expect(page.getByText(/^Today, /)).toBeVisible();
    const legend = page.getByRole('list', { name: 'Colour key' });
    await expect(legend).toContainText('Confirmed');
    await expect(legend).toContainText('Pending');
    await expect(legend).toContainText('Cancelled');

    // Today's weekday header is underlined in the primary colour.
    const underline = await page.locator('.orivex-fc .fc-col-header-cell.fc-weekday-today').evaluate((el) => getComputedStyle(el).borderBottomWidth);
    expect(underline).toBe('2px');

    // Neighbouring-month days are faded (fixed six-week grid).
    await expect(page.locator('.orivex-fc .fc-day-other').first()).toBeVisible();

    // A chip shows the patient and "time · visit type"; clicking opens the details card.
    const chip = page.locator('.orivex-fc .fc-chip').first();
    await expect(chip).toBeVisible();
    const patient = (await chip.locator('.fc-appt-name').innerText()).trim();
    await page.screenshot({ path: testInfo.outputPath('schedule-month-1280.png') });

    await chip.click();
    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    await expect(card).toContainText(patient);
    await expect(card).toContainText('Reason');
    // The card stays inside the viewport.
    const box = await card.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1280);
    await page.screenshot({ path: testInfo.outputPath('schedule-month-card-1280.png') });

    // Escape closes it; Enter on a focused chip opens it again (keyboard).
    await page.keyboard.press('Escape');
    await expect(card).toHaveCount(0);
    await chip.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
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
