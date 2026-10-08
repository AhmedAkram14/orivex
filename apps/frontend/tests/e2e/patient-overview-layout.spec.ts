import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './support/login.js';

// Patient Overview, lower card area (Health snapshot down to Recent medical records): one card rhythm.
// - every gap between neighbouring cards, across and down, is --card-gap (20px) +-1
// - in two columns, both columns end on the same line +-1 (no hole before the next block)
// - every card has the same corner radius (--r-card)
// - every card's header is 32px and sits 16px +-1 above its first content row
const TWO_COLUMNS = [
  { width: 1440, height: 900 },
  { width: 1150, height: 674 },
];
const ONE_COLUMN = [{ width: 390, height: 844 }];
const LOCALES = ['en', 'ar'] as const;

interface Box {
  title: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  radius: string;
  headerHeight: number;
  titleToContent: number;
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const area = document.querySelector<HTMLElement>('[data-slot="overview-cards"]');
    if (!area) return null;
    const cards: Box[] = [...area.children].map((card) => {
      const box = card.getBoundingClientRect();
      const header = card.querySelector<HTMLElement>('[data-slot="widget-header"]')!;
      const headerBox = header.getBoundingClientRect();
      const headerStyle = getComputedStyle(header);
      // The header's own row: its box less its padding, so the measure is row edge -> first content row.
      const rowTop = headerBox.top + parseFloat(headerStyle.paddingTop);
      const rowBottom = headerBox.bottom - parseFloat(headerStyle.paddingBottom);
      const content = card.querySelector('[data-slot="widget-content"]')!;
      const first = content.firstElementChild ?? content;
      return {
        title: card.querySelector('h2')?.textContent?.trim() ?? '?',
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        radius: getComputedStyle(card).borderTopLeftRadius,
        headerHeight: rowBottom - rowTop,
        titleToContent: first.getBoundingClientRect().top - rowBottom,
      };
    });
    const areaBox = area.getBoundingClientRect();
    return { cards, areaLeft: areaBox.left, areaRight: areaBox.right, areaBottom: areaBox.bottom, cardRadius: getComputedStyle(document.documentElement).getPropertyValue('--r-card').trim() };
  });
}

/** Each card's nearest neighbour below (overlapping across) and beside (overlapping down), with the gap to it. */
function neighbourGaps(cards: Box[]) {
  const gaps: { between: string; gap: number }[] = [];
  for (const a of cards) {
    const below = cards
      .filter((b) => b !== a && b.top >= a.bottom - 1 && b.left < a.right - 1 && b.right > a.left + 1)
      .sort((x, y) => x.top - y.top)[0];
    if (below) gaps.push({ between: `${a.title} / ${below.title}`, gap: below.top - a.bottom });
    const beside = cards
      .filter((b) => b !== a && b.left >= a.right - 1 && b.top < a.bottom - 1 && b.bottom > a.top + 1)
      .sort((x, y) => x.left - y.left)[0];
    if (beside) gaps.push({ between: `${a.title} | ${beside.title}`, gap: beside.left - a.right });
  }
  return gaps;
}

test.describe('Patient Overview: one card rhythm in the lower card area', () => {
  for (const locale of LOCALES) {
    for (const viewport of [...TWO_COLUMNS, ...ONE_COLUMN]) {
      const twoColumns = TWO_COLUMNS.includes(viewport);

      test(`${locale} @ ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await loginAs(page, 'patient');
        await page.goto(`/${locale}/patient`);
        await page.locator('[data-slot="overview-cards"] h2').first().waitFor();
        await page.waitForLoadState('networkidle').catch(() => {});

        const result = await measure(page);
        expect(result, 'the card area is on the page').not.toBeNull();
        const { cards, areaLeft, areaRight, areaBottom, cardRadius } = result!;
        expect(cards.length).toBeGreaterThanOrEqual(3);

        for (const card of cards) {
          expect.soft(card.radius, `${card.title}: radius`).toBe(cardRadius);
          expect.soft(Math.abs(card.headerHeight - 32), `${card.title}: header height ${card.headerHeight}`).toBeLessThanOrEqual(1);
          expect.soft(Math.abs(card.titleToContent - 16), `${card.title}: title -> content ${card.titleToContent}`).toBeLessThanOrEqual(1);
        }

        const gaps = neighbourGaps(cards);
        expect(gaps.length).toBeGreaterThanOrEqual(cards.length - 1);
        for (const { between, gap } of gaps) expect.soft(Math.abs(gap - 20), `${between}: gap ${gap}`).toBeLessThanOrEqual(1);

        // Columns: the half-width cards, grouped by their inline edge. One column below 1024px.
        const half = cards.filter((card) => card.right - card.left < areaRight - areaLeft - 1);
        const columns = new Map<number, Box[]>();
        for (const card of half) columns.set(Math.round(card.left), [...(columns.get(Math.round(card.left)) ?? []), card]);
        if (twoColumns) {
          expect(columns.size, 'two columns').toBe(2);
          const ends = [...columns.values()].map((column) => Math.max(...column.map((card) => card.bottom)));
          expect.soft(Math.abs(ends[0] - ends[1]), `columns end at ${ends.join(' / ')}`).toBeLessThanOrEqual(1);
          for (const end of ends) expect.soft(Math.abs(end - areaBottom), 'no hole under a column').toBeLessThanOrEqual(1);
        } else {
          expect(half.length, 'one column: every card spans the area').toBe(0);
        }
      });
    }
  }
});
