import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The landing page's "For patients" / "For doctors" sections: product vignettes built from the app's own components.
// The stage is illustrative and decorative -- nothing in it can be focused, it shows no names, photos or amounts --
// and each section's call to action follows who is viewing (a recruitment section never becomes a dashboard link).

const ACCOUNTS = { patient: 'patient02@orivex.dev', doctor: 'doctor02@orivex.dev' } as const;

async function signIn(page: Page, role: keyof typeof ACCOUNTS) {
  await page.goto('/en/login');
  await page.getByLabel('Email').fill(ACCOUNTS[role]);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(`/en/${role}`));
}

async function ctas(page: Page) {
  return page.evaluate(() =>
    ['#for-patients', '#for-doctors'].map((selector) =>
      [...document.querySelectorAll(`${selector} a, ${selector} button`)]
        .filter((element) => !element.closest('[inert]'))
        .map((element) => `${element.textContent?.trim()} -> ${element.getAttribute('href') ?? (element.getAttribute('aria-disabled') ? 'unavailable' : 'button')}`),
    ),
  );
}

test.describe.configure({ timeout: 120_000 });

test.describe('landing audience sections', () => {
  test('signed out: "Find a doctor" and "Apply as a doctor" (to registration)', async ({ page }) => {
    await page.goto('/en');
    await expect.poll(() => ctas(page), { timeout: 30_000 }).toEqual([['Find a doctor -> /en/patient/doctors'], ['Apply as a doctor -> /en/register']]);
  });

  test('signed in as a patient: still "Apply as a doctor" (patients apply through onboarding), never "Go to Dashboard"', async ({ page }) => {
    await signIn(page, 'patient');
    await page.goto('/en');
    await expect.poll(() => ctas(page), { timeout: 30_000 }).toEqual([['Find a doctor -> /en/patient/doctors'], ['Apply as a doctor -> /en/doctor/onboarding']]);
  });

  test('signed in as a doctor: "Go to your workspace"; the patient-only directory shows as unavailable', async ({ page }) => {
    await signIn(page, 'doctor');
    await page.goto('/en');
    // Wait for the session to resolve (until then the signed-out CTAs show).
    await expect.poll(async () => (await ctas(page))[1], { timeout: 30_000 }).toEqual(['Go to your workspace -> /en/doctor']);
    const [patients] = await ctas(page);
    expect(patients).toHaveLength(1);
    expect(patients[0]).toMatch(/^Find a doctor.*-> unavailable$/);
  });

  test('the stages are decorative and illustrative: hidden from assistive tech, inert, no names, photos or amounts', async ({ page }) => {
    await page.goto('/en');
    for (const selector of ['#for-patients', '#for-doctors']) {
      const stage = page.locator(`${selector} [data-showcase-stage]`);
      await expect(stage).toHaveCount(1);
      await expect(stage).toHaveAttribute('aria-hidden', 'true');
      await expect(stage).toHaveAttribute('role', 'presentation');
      // Every fragment is inert, so none of its controls can take focus.
      expect(await stage.locator('[inert]').count()).toBeGreaterThan(0);
      expect(await stage.locator(':not([inert]) > button, :not([inert]) > a').evaluateAll((nodes) => nodes.filter((node) => !node.closest('[inert]')).length)).toBe(0);
      await expect(stage.locator('img')).toHaveCount(0);
      const text = (await stage.textContent()) ?? '';
      expect(text).not.toMatch(/EGP|ج\.م|\d+\.\d{2}/);
      expect(text).not.toMatch(/Dr\.|د\./);
      // One sentence describes the stage to screen readers instead.
      await expect(page.locator(`${selector} p.sr-only`)).toHaveCount(1);
    }
  });

  test('Tab moves from a section\'s copy to its CTA and on, never into the stage', async ({ page }) => {
    await page.goto('/en');
    await page.locator('#for-patients h2').scrollIntoViewIfNeeded();
    const insideStage: string[] = [];
    // Walk the whole tab order once; record any stop inside either stage.
    for (let step = 0; step < 80; step += 1) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.closest('[data-showcase-stage]') ? active.outerHTML.slice(0, 80) : null;
      });
      if (where) insideStage.push(where);
    }
    expect(insideStage).toEqual([]);
  });

  for (const [locale, scheme] of [
    ['en', 'light'],
    ['ar', 'dark'],
  ] as const) {
    test(`axe: no serious or critical violations in the two sections (${locale}, ${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`/${locale}`);
      await page.locator('#for-doctors').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500); // let the reveal finish before measuring contrast
      const results = await new AxeBuilder({ page })
        .include('#for-patients')
        .include('#for-doctors')
        .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
        .analyze();
      const relevant = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
      expect(relevant.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
});
