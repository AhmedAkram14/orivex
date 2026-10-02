import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './support/login.js';

// Doctor › Schedule › Weekly availability: one compact week under shared defaults, with a sticky header and footer.
// The demo doctor (doctor@) works Sun-Thu 9 AM - 5 PM, Paid 500 EGP, a 1-2 PM break each working day; Fri/Sat off.

async function openEditor(page: Page, locale: 'en' | 'ar' = 'en', { reload = true } = {}) {
  // A full reload resets the in-browser mock backend, so reopening after a save must not reload.
  if (reload) {
    await page.goto(`/${locale}/doctor/schedule`);
    await page.locator('.orivex-fc').waitFor();
  }
  await page
    .getByRole('button', { name: locale === 'en' ? 'Edit availability' : 'تعديل التوفر' })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('[data-day-row]')).toHaveCount(7);
  return dialog;
}

const row = (page: Page, day: string) => page.locator(`[data-day-row="${day}"]`);

test.describe.configure({ timeout: 120_000 });

test.describe('Weekly availability dialog', () => {
  test('the whole week fits at 1278x748 with no scrolling, header and footer in place', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1278, height: 748 });
    await loginAs(page, 'doctor');
    const dialog = await openEditor(page);
    const scrolls = await dialog.evaluate((element) =>
      [element, ...element.querySelectorAll('*')].some(
        (node) =>
          node.scrollHeight > node.clientHeight + 1 &&
          /(auto|scroll)/.test(getComputedStyle(node).overflowY),
      ),
    );
    expect(scrolls).toBe(false);
    await expect(dialog.getByRole('heading', { name: 'Weekly availability' })).toBeInViewport();
    await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeInViewport();
    await expect(row(page, 'saturday')).toBeInViewport();
    // No horizontal scroll inside the table at the dialog's width.
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
  });

  test('edits: a day off and on, a break added and removed, a price overridden and reset, Copy to…', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1278, height: 748 });
    await loginAs(page, 'doctor');
    const dialog = await openEditor(page);
    const save = dialog.getByRole('button', { name: 'Save changes' });
    await expect(save).toBeDisabled();

    // Friday on: its hours, breaks and price cells appear; Save turns on.
    await dialog.getByRole('switch', { name: 'Friday working day' }).click();
    await expect(row(page, 'friday').getByLabel('Friday start time')).toBeVisible();
    await expect(save).toBeEnabled();
    await expect(dialog.getByText(/6 working days/)).toBeVisible();
    // ... and off again: nothing left to save.
    await dialog.getByRole('switch', { name: 'Friday working day' }).click();
    await expect(row(page, 'friday').getByText('Unavailable')).toBeVisible();
    await expect(save).toBeDisabled();

    // A break: add one on Monday, then remove it.
    await row(page, 'monday').getByRole('button', { name: 'Add a break on Monday' }).click();
    await page.getByLabel('Break start time').fill('15:00');
    await page.getByLabel('Break end time').fill('15:30');
    await page.getByRole('button', { name: 'Add break' }).click();
    await expect(row(page, 'monday').locator('[data-break-chip]')).toHaveCount(2);
    await row(page, 'monday')
      .getByRole('button', { name: /Remove the 3:00 – 3:30 PM break on Monday/ })
      .click();
    await expect(row(page, 'monday').locator('[data-break-chip]')).toHaveCount(1);

    // A price: Tuesday gets its own (the accent bar and chip), then goes back to the default.
    await row(page, 'tuesday').getByRole('button', { name: 'Tuesday price: Default' }).click();
    await page.getByLabel('Tuesday consultation fee').fill('450');
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(
      row(page, 'tuesday').getByRole('button', { name: 'Tuesday price: EGP 450' }),
    ).toBeVisible();
    await expect(row(page, 'tuesday')).toHaveAttribute('data-override', 'true');
    await row(page, 'tuesday').getByRole('button', { name: 'Tuesday price: EGP 450' }).click();
    await page.getByRole('button', { name: 'Use default' }).click();
    await page.keyboard.press('Escape');
    await expect(
      row(page, 'tuesday').getByRole('button', { name: 'Tuesday price: Default' }),
    ).toBeVisible();
    await expect(row(page, 'tuesday')).not.toHaveAttribute('data-override');

    // Copy to… with the mouse: Sunday onto Friday and Saturday (both become working days with Sunday's break).
    await row(page, 'sunday').getByRole('button', { name: 'Sunday actions' }).click();
    await page.getByRole('menuitem', { name: 'Copy to…' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Friday' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Saturday' }).click();
    await page.getByRole('menuitem', { name: 'Copy to 2 days' }).click();
    await expect(row(page, 'friday').locator('[data-break-chip]')).toHaveCount(1);
    await expect(row(page, 'saturday').locator('[data-break-chip]')).toHaveCount(1);
    await expect(dialog.getByText(/7 working days/)).toBeVisible();
  });

  test('validation: an end before the start is said under the row and Save stays off', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1278, height: 748 });
    await loginAs(page, 'doctor');
    const dialog = await openEditor(page);
    await row(page, 'wednesday').getByLabel('Wednesday end time').fill('08:00');
    await expect(
      row(page, 'wednesday').getByText('End time must be after the start time.'),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  test('Escape closes a popover before the dialog; closing with edits asks to discard them', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1278, height: 748 });
    await loginAs(page, 'doctor');
    const dialog = await openEditor(page);
    await row(page, 'monday').getByRole('button', { name: 'Monday price: Default' }).click();
    await expect(page.getByRole('button', { name: 'Use default' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Use default' })).toBeHidden();
    await expect(dialog).toBeVisible();

    await dialog.getByRole('switch', { name: 'Saturday working day' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Discard changes?' })).toBeVisible();
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect(row(page, 'saturday').getByLabel('Saturday start time')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('saving sends the same per-day payload, changed only where it was edited', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1278, height: 748 });
    await loginAs(page, 'doctor');
    const patch = () =>
      page
        .waitForRequest(
          (candidate) =>
            candidate.url().endsWith('/scheduling/doctor-availability') &&
            candidate.method() === 'PATCH',
        )
        .then(
          (request) => JSON.parse(request.postData() ?? '[]') as Array<Record<string, unknown>>,
        );

    // Edit: Monday's own price, 450.
    let dialog = await openEditor(page);
    await row(page, 'monday').getByRole('button', { name: 'Monday price: Default' }).click();
    await page.getByLabel('Monday consultation fee').fill('450');
    await page.getByRole('button', { name: 'Done' }).click();
    let sent = patch();
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    const edited = await sent;
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Undo it the same way: Monday back on the default. That save is the original schedule again.
    dialog = await openEditor(page, 'en', { reload: false });
    await row(page, 'monday').getByRole('button', { name: 'Monday price: EGP 450' }).click();
    await page.getByRole('button', { name: 'Use default' }).click();
    await page.keyboard.press('Escape');
    sent = patch();
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    const original = await sent;

    expect(edited).toHaveLength(7);
    const changed = edited.flatMap((day, index) =>
      ['dayOfWeek', 'isWorkingDay', 'hours', 'breaks', 'pricing']
        .filter((field) => JSON.stringify(day[field]) !== JSON.stringify(original[index]![field]))
        .map((field) => `${day.dayOfWeek as string}.${field}`),
    );
    expect(changed).toEqual(['monday.pricing']);
    expect(edited[1]!.pricing).toEqual({ pricingType: 'paid', feeAmount: 450, feeCurrency: 'EGP' });
    expect(original[1]!.pricing).toEqual(original[2]!.pricing);
  });

  for (const [locale, scheme, width] of [
    ['en', 'light', 1278],
    ['ar', 'dark', 390],
  ] as const) {
    test(`axe: no serious or critical violations in the dialog (${locale}, ${scheme}, ${width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width > 600 ? 748 : 844 });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await loginAs(page, 'doctor');
      await openEditor(page, locale);
      const results = await new AxeBuilder({ page })
        .include('[data-weekly-availability]')
        .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
        .analyze();
      const relevant = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(
        relevant.map(
          (violation) =>
            `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
        ),
      ).toEqual([]);
    });
  }

  test('390px: a full-height sheet, all seven days collapsed on one screen, one open at a time', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await loginAs(page, 'doctor');
    const dialog = await openEditor(page, 'ar');
    for (const day of [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]) {
      await expect(row(page, day)).toBeInViewport({ ratio: 1 });
    }
    await expect(dialog.getByRole('button', { name: 'حفظ التغييرات' })).toBeInViewport();
    // One row open at a time.
    await row(page, 'sunday').getByRole('button', { expanded: false }).click();
    await expect(row(page, 'sunday').getByLabel(/الأحد/).first()).toBeVisible();
    await row(page, 'monday').getByRole('button', { expanded: false }).click();
    await expect(row(page, 'sunday').getByRole('button', { expanded: false })).toBeVisible();
    await expect(row(page, 'monday').getByRole('button', { expanded: true })).toBeVisible();
  });
});
