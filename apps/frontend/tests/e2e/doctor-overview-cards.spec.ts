import { expect, test, type Page } from '@playwright/test';

// Doctor Overview: the day strip's availability colours hold WCAG 1.4.11 (3:1 for meaningful graphics) against what
// is actually rendered behind them, and the cards in one row share one height without leaving a card mostly empty.
//
// Contrast is measured on real pixels: a 2x screenshot decoded in a blank page, each mark sampled where it is solid
// and compared with the hero ground right next to it. A free band is a lime fill with an olive stroke: the fill alone
// is 1.24:1 on white by design, so the stroke is what must hold 3:1 (against the ground, and against the fill).

const PASSWORD = 'Password123!';

// Cairo is UTC+3 on 2026-10-01 (a Thursday). doctor@ works 9 AM - 5 PM and its seeded busy day is laid out around
// "now" (here 11 AM); doctor01 works 9 AM - 7 PM and has nothing booked.
const STATES = {
  booked: { email: 'doctor@orivex.dev', clock: '2026-10-01T08:00:00Z' }, // 11 AM, a busy day under way
  empty: { email: 'doctor01@orivex.dev', clock: '2026-10-01T14:00:00Z' }, // 5 PM, hours running
  afterHours: { email: 'doctor01@orivex.dev', clock: '2026-10-01T18:30:00Z' }, // 9:30 PM, hours over
} as const;

async function openOverview(page: Page, state: keyof typeof STATES) {
  const { email, ...rest } = STATES[state];
  if ('clock' in rest) await page.clock.setFixedTime(new Date(rest.clock));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/doctor$/, { timeout: 30_000 });
  await page.locator('main [data-day-strip]').waitFor({ timeout: 30_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

function luminance([r, g, b]: number[]) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
}
function contrast(a: number[], b: number[]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

interface Probe {
  label: string;
  /** Candidate pixels for the mark (CSS px); the most contrasting one is the solid mark (edges are anti-aliased). */
  mark: { x: number; y: number }[];
  ground: { x: number; y: number };
  fill?: { x: number; y: number };
}

/** The strip's marks, in viewport CSS pixels, with a ground sample beside each. */
async function probes(page: Page): Promise<Probe[]> {
  return page.evaluate(() => {
    const strip = document.querySelector('main [data-day-strip]')!;
    const rect = (el: Element) => el.getBoundingClientRect();
    const out: Probe[] = [];
    const now = strip.querySelector('[data-strip-now]');
    const nowX = now ? rect(now).left + rect(now).width / 2 : null;
    const awayFromNow = (r: DOMRect) => {
      const middle = r.left + r.width / 2;
      return nowX != null && Math.abs(middle - nowX) < 28
        ? middle < nowX
          ? r.left + 8
          : r.right - 8
        : middle;
    };
    const edgeRows = (x: number, top: number) => [0, 0.5, 1, 1.5].map((dy) => ({ x, y: top + dy }));
    // The ground is sampled just below each mark: above the track sits the "Now" pill (lime), below it only surface.
    strip.querySelectorAll('[data-strip-segment="available"]').forEach((el, index) => {
      const r = rect(el);
      const x = awayFromNow(r);
      out.push({
        label: `free band ${index + 1}`,
        mark: edgeRows(x, r.top),
        ground: { x, y: r.bottom + 5 },
        fill: { x, y: r.top + r.height / 2 },
      });
    });
    strip.querySelectorAll('[data-strip-segment="booked"]').forEach((el, index) => {
      const r = rect(el);
      const x = r.left + r.width / 2;
      const groundX = nowX != null && Math.abs(x - nowX) < 6 ? x + 10 : x;
      out.push({
        label: `booked ${index + 1}`,
        mark: [{ x, y: r.top + r.height / 2 }],
        ground: { x: groundX, y: r.bottom + 4 },
      });
    });
    if (now) {
      const r = rect(now);
      const y = r.bottom - 4; // below the track, above the hour labels
      out.push({
        label: 'now line',
        mark: [-0.5, 0, 0.5].map((dx) => ({ x: nowX! + dx, y })),
        ground: { x: nowX! + 10, y },
      });
    }
    for (const kind of ['available', 'booked'] as const) {
      const swatch = strip.querySelector(`[data-legend-swatch="${kind}"]`)!;
      const r = rect(swatch);
      const x = r.left + r.width / 2;
      out.push({
        label: `legend ${kind}`,
        mark: kind === 'available' ? edgeRows(x, r.top) : [{ x, y: r.top + r.height / 2 }],
        ground: { x, y: r.top - 3 },
        fill: kind === 'available' ? { x, y: r.top + r.height / 2 } : undefined,
      });
    }
    return out;
  });
}

/** RGB of each requested viewport point, read from a 2x screenshot decoded in a blank page (no app CSP in the way). */
async function readPixels(page: Page, points: { x: number; y: number }[]) {
  const png = (await page.screenshot()).toString('base64');
  const decoder = await page.context().newPage();
  try {
    return await decoder.evaluate(
      async ({ data, points: wanted }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return wanted.map(({ x, y }) => [
          ...context.getImageData(Math.round(x * 2), Math.round(y * 2), 1, 1).data.slice(0, 3),
        ]);
      },
      { data: png, points },
    );
  } finally {
    await decoder.close();
  }
}

test.describe.configure({ timeout: 180_000 });
test.use({ deviceScaleFactor: 2 });

test.describe('Doctor Overview: availability contrast', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const state of ['booked', 'empty'] as const) {
      test(`every mark on the day strip and its legend holds 3:1 (${state} day, ${scheme})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1278, height: 748 });
        await page.emulateMedia({ colorScheme: scheme });
        await openOverview(page, state);
        await page.locator('main [data-day-strip]').scrollIntoViewIfNeeded();
        const marks = await probes(page);
        expect(
          marks.filter((probe) => probe.label.startsWith('free band')).length,
          'the day has free time to draw',
        ).toBeGreaterThan(0);

        const points = marks.flatMap((probe) => [
          ...probe.mark,
          probe.ground,
          ...(probe.fill ? [probe.fill] : []),
        ]);
        const pixels = await readPixels(page, points);
        let cursor = 0;
        const surface = scheme === 'light' ? [255, 255, 255] : [18, 26, 28];
        for (const probe of marks) {
          const markPixels = probe.mark.map(() => pixels[cursor++]!);
          const ground = pixels[cursor++]!;
          const fill = probe.fill ? pixels[cursor++]! : undefined;
          // Data never sits on a lime tint: the ground beside every mark is the plain surface.
          expect
            .soft(
              Math.max(...ground.map((value, index) => Math.abs(value - surface[index]!))),
              `${probe.label}: ground ${ground} is the surface`,
            )
            .toBeLessThanOrEqual(3);
          const best = markPixels.reduce((a, b) =>
            contrast(a, ground) >= contrast(b, ground) ? a : b,
          );
          const ratio = contrast(best, ground);
          expect
            .soft(ratio, `${probe.label}: ${best} on ${ground} = ${ratio.toFixed(2)}:1`)
            .toBeGreaterThanOrEqual(3);
          if (fill) {
            const strokeOnFill = contrast(best, fill);
            expect
              .soft(
                strokeOnFill,
                `${probe.label}: stroke ${best} on its fill ${fill} = ${strokeOnFill.toFixed(2)}:1`,
              )
              .toBeGreaterThanOrEqual(3);
          }
        }
      });
    }
  }
});

test.describe('Doctor Overview: one height per card row', () => {
  for (const state of ['booked', 'empty', 'afterHours'] as const) {
    test(`cards in a row share one height; no card is left mostly empty (${state})`, async ({
      page,
    }) => {
      await openOverview(page, state);
      for (const [width, height] of [
        [1440, 900],
        [1278, 748],
        [1046, 612],
      ] as const) {
        await page.setViewportSize({ width, height });
        await page.goto('/en/doctor');
        await page.locator('main [data-day-strip]').waitFor({ timeout: 30_000 });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(500);
        const rows = await page.evaluate(() =>
          [...document.querySelectorAll('main [data-slot="dashboard-grid"]')].flatMap((grid) => {
            const cards = [...grid.children].filter(
              (card) => card.getBoundingClientRect().height > 0,
            );
            const byTop = new Map<number, Element[]>();
            for (const card of cards) {
              const top = Math.round(card.getBoundingClientRect().top);
              byTop.set(top, [...(byTop.get(top) ?? []), card]);
            }
            return [...byTop.values()].map((row) =>
              row.map((card) => {
                // header, body (the stretching content), then an optional footer action
                const body = card.children[1]!;
                const style = getComputedStyle(body);
                const contentBottom = Math.max(
                  ...[...body.children].map((child) => child.getBoundingClientRect().bottom),
                );
                return {
                  name: card.querySelector('h2, h3')?.textContent?.trim() ?? '?',
                  height: card.getBoundingClientRect().height,
                  empty: card.hasAttribute('data-empty'),
                  unused:
                    body.getBoundingClientRect().bottom -
                    parseFloat(style.paddingBottom) -
                    contentBottom,
                };
              }),
            );
          }),
        );
        for (const row of rows) {
          const names = row.map((card) => card.name).join(' | ');
          if (row.length > 1) {
            const heights = row.map((card) => card.height);
            expect
              .soft(
                Math.max(...heights) - Math.min(...heights),
                `${state} ${width}: ${names} heights ${heights.map(Math.round)}`,
              )
              .toBeLessThanOrEqual(0.5);
          }
          for (const card of row.filter((entry) => !entry.empty)) {
            expect
              .soft(
                card.unused,
                `${state} ${width}: ${card.name} leaves ${Math.round(card.unused)}px unused`,
              )
              .toBeLessThanOrEqual(48);
          }
        }
      }
    });
  }
});
