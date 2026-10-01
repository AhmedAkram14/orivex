import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './support/login.js';

// The landing page's vertical rhythm (design-system/tokens/scales.css: --section-y). Between two consecutive
// sections, the space from the last visible content of one to the first visible content of the next is one
// --section-y step; a band's edge stands in for content on the band's side, and a band is padded inside by the
// same step. "Visible content" is text and the visible surfaces content sits on (cards, panels, chips, images) --
// not decorations (aria-hidden + pointer-events-none), not screen-reader-only text.
//
// Reduced motion: a section not yet scrolled into view starts its reveal 24px low and transparent (RevealOnScroll);
// the rhythm is measured at rest.

const WIDTHS = [
  { width: 1440, min: 88, max: 104 },
  { width: 1278, min: 88, max: 104 },
  { width: 768, min: 64, max: 80 },
  { width: 390, min: 48, max: 64 },
];

interface Block {
  name: string;
  band: boolean;
  top: number;
  bottom: number;
  contentTop: number;
  contentBottom: number;
  /** A contained band (a panel padded by the full step), measured inside like a band. */
  panel?: { top: number; bottom: number; contentTop: number; contentBottom: number };
}

async function measureBlocks(page: Page): Promise<Block[]> {
  return page.evaluate(() => {
    const isDecoration = (el: Element) =>
      !!el.closest('[aria-hidden="true"].pointer-events-none, .sr-only');
    const visible = (el: Element) =>
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
      el.getBoundingClientRect().height > 0;
    const hasSurface = (el: Element) => {
      const style = getComputedStyle(el);
      const background =
        style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none';
      const border =
        parseFloat(style.borderTopWidth) > 0 && style.borderTopColor !== 'rgba(0, 0, 0, 0)';
      return background || border || el.tagName === 'IMG';
    };
    // The vertical extent of everything visible inside `root` (excluding `root`'s own surface).
    const extent = (root: Element) => {
      let top = Infinity;
      let bottom = -Infinity;
      const take = (rect: DOMRect) => {
        if (rect.width === 0 || rect.height === 0) return;
        top = Math.min(top, rect.top);
        bottom = Math.max(bottom, rect.bottom);
      };
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!node.textContent?.trim() || !parent || isDecoration(parent) || !visible(parent))
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) take(rect);
      }
      for (const el of root.querySelectorAll('*')) {
        if (isDecoration(el) || !hasSurface(el) || !visible(el)) continue;
        take(el.getBoundingClientRect());
      }
      return { top: top + scrollY, bottom: bottom + scrollY };
    };

    const hero = document.querySelector('main h1')!.closest('main > *')!;
    const sections = [...document.querySelectorAll('[data-landing-section]')];
    const footer = document.querySelector('footer')!;
    return [hero, ...sections, footer].map((el) => {
      const rect = el.getBoundingClientRect();
      const content = extent(el);
      const panelEl = el.querySelector('[data-landing-panel]');
      let panel: Block['panel'];
      if (panelEl) {
        const panelRect = panelEl.getBoundingClientRect();
        const inner = extent(panelEl);
        panel = {
          top: panelRect.top + scrollY,
          bottom: panelRect.bottom + scrollY,
          contentTop: inner.top,
          contentBottom: inner.bottom,
        };
      }
      return {
        name:
          el === hero
            ? 'hero'
            : el === footer
              ? 'footer'
              : el.id || el.querySelector('h2')?.textContent?.trim().slice(0, 30) || 'section',
        band: el.getAttribute('data-landing-section') === 'band' || el === footer,
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
        contentTop: content.top,
        contentBottom: content.bottom,
        panel,
      };
    });
  });
}

/** Every gap the rhythm defines, named, in page order. */
function gaps(blocks: Block[]) {
  const out: { label: string; value: number }[] = [];
  blocks.forEach((block, index) => {
    const previous = blocks[index - 1];
    if (previous) {
      // Canvas content to a band's edge, a band's edge to canvas content, or content to content.
      const from = previous.band ? previous.bottom : previous.contentBottom;
      const to = block.band ? block.top : block.contentTop;
      out.push({ label: `${previous.name} -> ${block.name}`, value: Math.round(to - from) });
    }
    if (block.band && block.name !== 'footer') {
      out.push({
        label: `${block.name} inside top`,
        value: Math.round(block.contentTop - block.top),
      });
      out.push({
        label: `${block.name} inside bottom`,
        value: Math.round(block.bottom - block.contentBottom),
      });
    }
    if (block.panel) {
      out.push({
        label: `${block.name} panel inside top`,
        value: Math.round(block.panel.contentTop - block.panel.top),
      });
      out.push({
        label: `${block.name} panel inside bottom`,
        value: Math.round(block.panel.bottom - block.panel.contentBottom),
      });
    }
  });
  return out;
}

async function expectOneRhythm(page: Page, locale: 'en' | 'ar', min: number, max: number) {
  await page.goto(`/${locale}`);
  // The live sections (specialties, doctors) render their real content, not skeletons.
  await expect(page.locator('#specialties').getByRole('link').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  const measured = gaps(await measureBlocks(page));
  // Sanity: the walk met every section (hero, 9 sections, footer => 10 neighbours, 2 band edges x2, 1 panel x2).
  expect(measured.length).toBe(14);
  for (const { label, value } of measured) {
    expect.soft(value, `${label}: ${value}px`).toBeGreaterThanOrEqual(min);
    expect.soft(value, `${label}: ${value}px`).toBeLessThanOrEqual(max);
  }
}

test.describe.configure({ timeout: 120_000 });

test.describe('landing: one vertical rhythm', () => {
  for (const locale of ['en', 'ar'] as const) {
    for (const { width, min, max } of WIDTHS) {
      test(`every section gap is one step (${locale}, ${width}px: ${min}-${max})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expectOneRhythm(page, locale, min, max);
      });
    }
  }

  // A signed-in viewer sees other calls to action (and a different navbar); the rhythm is the same, in both themes.
  for (const [role, locale, colorScheme] of [
    ['patient', 'ar', 'dark'],
    ['doctor', 'en', 'light'],
    ['doctor', 'ar', 'dark'],
  ] as const) {
    test(`signed in as a ${role} (${locale}, ${colorScheme}, 1046px: 88-104)`, async ({ page }) => {
      await loginAs(page, role);
      await page.setViewportSize({ width: 1046, height: 612 });
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme });
      await expectOneRhythm(page, locale, 88, 104);
    });
  }
});
