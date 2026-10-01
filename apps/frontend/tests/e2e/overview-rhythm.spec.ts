import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './support/login.js';

// The Overviews' two-level rhythm (design-system/tokens/scales.css): the page's groups sit one --group-gap apart;
// the cards inside a group (DashboardGroup, DashboardGrid) one --card-gap apart, on both axes -- a grid's rows as
// far apart as its columns.

interface Gap {
  where: string;
  axis: 'vertical' | 'horizontal';
  value: number;
  expected: number;
}

async function measureGaps(page: Page): Promise<Gap[]> {
  return page.evaluate(() => {
    const px = (el: Element, name: string) =>
      parseFloat(getComputedStyle(el).getPropertyValue(name));
    const shown = (el: Element) => el.getBoundingClientRect().height > 0;
    const gaps: Gap[] = [];
    const root = document.querySelector('main [data-slot="page"]')!;
    const groupGap = px(root, '--group-gap');
    const cardGap = px(root, '--card-gap');

    const stack = (el: Element, where: string, expected: number) => {
      const kids = [...el.children].filter(shown);
      kids.slice(1).forEach((kid, index) => {
        const value = kid.getBoundingClientRect().top - kids[index]!.getBoundingClientRect().bottom;
        gaps.push({
          where: `${where} #${index + 1}`,
          axis: 'vertical',
          value: Math.round(value),
          expected,
        });
      });
    };
    stack(root, 'page', groupGap);
    document
      .querySelectorAll('main [data-slot="dashboard-group"]')
      .forEach((group, index) => stack(group, `group ${index}`, cardGap));

    document.querySelectorAll('main [data-slot="dashboard-grid"]').forEach((grid, gridIndex) => {
      // Cells by row (same top); a row's next row starts one gap below the row's tallest cell.
      const cells = [...grid.children].filter(shown).map((cell) => cell.getBoundingClientRect());
      const rows = new Map<number, DOMRect[]>();
      for (const cell of cells) {
        const key = [...rows.keys()].find((top) => Math.abs(top - cell.top) < 2) ?? cell.top;
        rows.set(key, [...(rows.get(key) ?? []), cell]);
      }
      const ordered = [...rows.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, row]) => row.sort((a, b) => a.left - b.left));
      ordered.forEach((row, rowIndex) => {
        row.slice(1).forEach((cell, index) => {
          gaps.push({
            where: `grid ${gridIndex} row ${rowIndex}`,
            axis: 'horizontal',
            value: Math.round(cell.left - row[index]!.right),
            expected: cardGap,
          });
        });
        const next = ordered[rowIndex + 1];
        if (next) {
          const value =
            Math.min(...next.map((cell) => cell.top)) - Math.max(...row.map((cell) => cell.bottom));
          gaps.push({
            where: `grid ${gridIndex} row ${rowIndex}->${rowIndex + 1}`,
            axis: 'vertical',
            value: Math.round(value),
            expected: cardGap,
          });
        }
      });
    });
    return gaps;
  });
}

test.describe.configure({ timeout: 180_000 });

test.describe('Overviews: groups --group-gap apart, cards --card-gap apart on both axes', () => {
  for (const role of ['patient', 'doctor'] as const) {
    test(`${role} Overview`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await loginAs(page, role);
      let horizontal = 0;
      for (const locale of ['en', 'ar'] as const) {
        for (const width of [1440, 1046, 390]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`/${locale}/${role}`);
          await page.locator('main [data-slot="dashboard-group"]').first().waitFor();
          await page.waitForLoadState('networkidle').catch(() => {});
          await page.waitForTimeout(500);
          const gaps = await measureGaps(page);
          expect(gaps.length, `${locale} ${width}: the walk met the groups`).toBeGreaterThan(3);
          for (const { where, axis, value, expected } of gaps) {
            expect
              .soft(
                Math.abs(value - expected),
                `${locale} ${width} ${where} (${axis}): ${value}px, expected ${expected}`,
              )
              .toBeLessThanOrEqual(1);
          }
          horizontal += gaps.filter((gap) => gap.axis === 'horizontal').length;
        }
      }
      // Side-by-side cards were really measured (not only stacks).
      expect(horizontal).toBeGreaterThan(0);
    });
  }
});
