import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Doctor › Earnings: one summary card, the chart at the range's granularity, the range's transactions. The demo
// doctor@ has a seeded ledger in the mock backend (mocks/earnings-store.ts, computed like the real backend);
// doctor01 has none. The clock is pinned so the presets cover the same days on every run.

const NOW = new Date('2026-10-03T12:00:00Z');

async function openEarnings(page: Page, email = 'doctor@orivex.dev', locale: 'en' | 'ar' = 'en') {
  await page.clock.setFixedTime(NOW);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/doctor$/, { timeout: 30_000 });
  await page.goto(`/${locale}/doctor/earnings`);
  await page.locator('[data-earnings-summary]').waitFor();
  await page.waitForLoadState('networkidle').catch(() => {});
}

const bars = (page: Page) => page.locator('[data-earnings-chart] [data-bucket]');

function luminance([r, g, b]: number[]) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
}
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/** RGB at viewport points, from a screenshot decoded in a blank page (scaled to the screenshot's own pixel density). */
async function pixels(page: Page, points: { x: number; y: number }[]) {
  const png = (await page.screenshot()).toString('base64');
  const viewportWidth = page.viewportSize()!.width;
  const decoder = await page.context().newPage();
  try {
    return await decoder.evaluate(
      async ({ data, wanted, viewportWidth: cssWidth }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const scale = image.width / cssWidth;
        return wanted.map(({ x, y }) => [
          ...context
            .getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1)
            .data.slice(0, 3),
        ]);
      },
      { data: png, wanted: points, viewportWidth },
    );
  } finally {
    await decoder.close();
  }
}

test.describe.configure({ timeout: 180_000 });

test.describe('Doctor Earnings', () => {
  test('the chart follows the range: daily, weekly, monthly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEarnings(page);
    const chart = page.locator('[data-earnings-chart]');
    await expect(chart).toHaveAttribute('data-earnings-chart', 'day');
    await expect(bars(page)).toHaveCount(30);

    await page.getByRole('button', { name: '7 days' }).click();
    await expect(bars(page)).toHaveCount(7);
    await expect(chart).toHaveAttribute('data-earnings-chart', 'day');

    await page.getByRole('button', { name: '90 days' }).click();
    await expect(chart).toHaveAttribute('data-earnings-chart', 'week');
    await expect(bars(page)).toHaveCount(13);

    await page.getByRole('button', { name: 'All time' }).click();
    await expect(chart).toHaveAttribute('data-earnings-chart', 'month');
    // From the first month with a payment to this month; no comparison for an open-ended range.
    expect(await bars(page).count()).toBeGreaterThan(6);
    await expect(page.locator('[data-earnings-summary]').getByText(/vs prev\./)).toHaveCount(0);
    await expect(page).toHaveURL(/dateFrom=2020-01-01/);
  });

  test('keyboard: one tab stop on the chart; arrows move between bars and show their figures', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEarnings(page);
    const latest = page.locator('[data-earnings-chart] [data-latest]');
    await latest.focus();
    await expect(page.getByRole('tooltip')).toContainText('Net');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-earnings-chart] [data-bucket]:focus')).toHaveAttribute(
      'data-bucket',
      '2026-10-01',
    );
    await expect(page.getByRole('tooltip')).toContainText(/Gross.*Commission.*Net/s);
    await expect(page.locator('[data-earnings-chart] [data-bucket][tabindex="0"]')).toHaveCount(1);
  });

  test('a row opens its appointment; refunds are listed and never split', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEarnings(page);
    const table = page.locator('[data-earnings-transactions] table');
    await expect(table.getByRole('columnheader', { name: 'Commission' })).toBeVisible();
    await expect(table.getByText('Paid').first()).toBeVisible();
    await expect(table.getByText('Succeeded')).toHaveCount(0);
    await expect(table.getByText('View appointment')).toHaveCount(0);
    const first = table.locator('[data-transaction-row]').first();
    await first.locator('td').nth(3).click();
    await expect(page).toHaveURL(/\/en\/doctor\/appointments\?highlight=/);
  });

  test('a doctor with no earnings: zeros, ticks, and one illustrated empty state', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEarnings(page, 'doctor01@orivex.dev');
    await expect(
      page.locator('[data-earnings-summary]').getByText('EGP 0.00').first(),
    ).toBeVisible();
    await expect(page.getByText('No earnings in this period')).toBeVisible();
    await expect(bars(page)).toHaveCount(30);
    await expect(page.getByText('No paid consultations in this period')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open your schedule' })).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`contrast: the where-it-went bar and the chart's bars hold 3:1 against the card (${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await openEarnings(page);
      const probe = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const net = box('[data-where-it-went] [data-segment="net"]');
        const commission = box('[data-where-it-went] [data-segment="commission"]');
        const card = box('[data-earnings-summary]');
        const bar = [
          ...document.querySelectorAll(
            '[data-earnings-chart] [data-bucket]:not([data-latest]) span',
          ),
        ]
          .map((element) => element.getBoundingClientRect())
          .find((rect) => rect.height > 20)!;
        const chart = box('[data-earnings-chart]');
        return {
          net: { x: net.left + net.width / 2, y: net.top + net.height / 2 },
          // The commission's tint, between its hatch lines: sampled along a short run, darkest/lightest taken below.
          commission: Array.from({ length: 8 }, (_, index) => ({
            x: commission.left + 6 + index,
            y: commission.top + commission.height / 2,
          })),
          card: { x: card.right - 12, y: net.top - 8 },
          bar: { x: bar.left + bar.width / 2, y: bar.top + bar.height / 2 },
          chart: { x: chart.right - 6, y: bar.top + bar.height / 2 },
        };
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      const [net, ...rest] = await pixels(page, [
        probe.net,
        ...probe.commission,
        probe.card,
        probe.bar,
        probe.chart,
      ]);
      const commissionRun = rest.slice(0, 8);
      const [card, bar, chartGround] = rest.slice(8);
      const commission = commissionRun.reduce((best, color) =>
        contrast(color, card!) > contrast(best, card!) ? color : best,
      );
      expect(contrast(net!, card!), `net ${net} on ${card}`).toBeGreaterThanOrEqual(3);
      expect(
        contrast(commission, card!),
        `commission ${commission} on ${card}`,
      ).toBeGreaterThanOrEqual(3);
      expect(contrast(bar!, chartGround!), `bar ${bar} on ${chartGround}`).toBeGreaterThanOrEqual(
        3,
      );
    });
  }

  for (const [locale, scheme, width] of [
    ['en', 'light', 1440],
    ['ar', 'dark', 390],
  ] as const) {
    test(`axe: no serious or critical violations (${locale}, ${scheme}, ${width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width > 600 ? 900 : 844 });
      await page.emulateMedia({ colorScheme: scheme });
      await openEarnings(page, 'doctor@orivex.dev', locale);
      const results = await new AxeBuilder({ page })
        .include('main')
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
});
