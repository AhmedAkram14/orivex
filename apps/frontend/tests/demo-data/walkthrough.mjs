/**
 * Demo-data browser walkthrough against the REAL local stack (no MSW):
 *
 *   node tests/demo-data/walkthrough.mjs [all|reference|others|public|<account-key>...]
 *
 * For every demo account: sign in through the real login form, land on the
 * role's workspace, open the primary screens, and record console errors,
 * failed API calls (4xx/5xx) and broken images. The reference accounts
 * (doctor03, patient03, admin) get every screen plus 375 px mobile views.
 * Screenshots go to test-results/demo-data/ (git-ignored).
 *
 * Run against `next build && next start` -- `next dev` compiles each route on
 * first visit and is too slow for a 42-account run.
 *
 * Env: APP_URL (default http://localhost:3000), API_URL (default
 * http://localhost:4000), DEMO_IDS (JSON with patient03/doctor03 profile ids,
 * pendingCase id and rxCode, a prescription verification code). Every screen
 * and each of its tabs logs any empty state it shows ("EMPTY" lines), and
 * `public` walks the signed-out pages.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const APP = process.env.APP_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:4000';
const PASSWORD = 'Password123!';
const IDS = JSON.parse(process.env.DEMO_IDS ?? '{}');
const OUT = path.resolve('test-results', 'demo-data');
mkdirSync(OUT, { recursive: true });

const pad = (n) => String(n).padStart(2, '0');
const doctors = Array.from({ length: 20 }, (_, i) => `doctor${pad(i + 1)}`);
const patients = Array.from({ length: 20 }, (_, i) => `patient${pad(i + 1)}`);

const DOCTOR_DEEP = [
  ['dashboard', '/en/doctor'],
  ['queue', '/en/doctor/queue'],
  ['appointments', '/en/doctor/appointments'],
  ['patients', '/en/doctor/patients'],
  ['patient-chart', `/en/doctor/patients/${IDS.patient03}`],
  ['schedule', '/en/doctor/schedule'],
  ['earnings', '/en/doctor/earnings'],
  ['reports', '/en/doctor/reports'],
  ['profile', '/en/doctor/profile'],
  ['messages', '/en/doctor/messages'],
  ['knowledge', '/en/doctor/knowledge'],
  ['disputes', '/en/doctor/disputes'],
  ['settings', '/en/doctor/settings'],
  ['consultation', '/en/doctor/consultation'],
  ['security', '/en/security'],
  ['notifications', '/en/notifications'],
];
const PATIENT_DEEP = [
  ['dashboard', '/en/patient'],
  ['appointments', '/en/patient/appointments'],
  ['records', '/en/patient/records'],
  ['records-visits', '/en/patient/records?tab=visits'],
  ['records-conditions', '/en/patient/records?tab=conditions'],
  ['records-documents', '/en/patient/records?tab=documents'],
  ['records-medications', '/en/patient/records?tab=medications'],
  ['prescriptions', '/en/patient/prescriptions'],
  ['health', '/en/patient/health'],
  ['messages', '/en/patient/messages'],
  ['profile', '/en/patient/profile'],
  ['knowledge', '/en/patient/knowledge'],
  ['waitlist', '/en/patient/waitlist'],
  ['disputes', '/en/patient/disputes'],
  ['doctors', '/en/patient/doctors'],
  ['doctor-profile', `/en/patient/doctors/${IDS.doctor03}`],
  ['booking', `/en/patient/appointments/book?doctorId=${IDS.doctor03}`],
  ['specialties', '/en/patient/specialties'],
  ['security', '/en/security'],
  ['notifications', '/en/notifications'],
];
const ADMIN_DEEP = [
  ['dashboard', '/en/admin'],
  ['analytics', '/en/admin/analytics'],
  ['verification-queue', '/en/admin/verification-queue'],
  ['verification-case', `/en/admin/verification-queue/${IDS.pendingCase}`],
  ['reviews', '/en/admin/reviews'],
  ['disputes', '/en/admin/disputes'],
  ['knowledge', '/en/admin/knowledge'],
  ['users', '/en/admin/users'],
  ['audit-log', '/en/admin/audit-log'],
  ['hospitals', '/en/admin/hospitals'],
  ['feature-flags', '/en/admin/feature-flags'],
  ['security', '/en/security'],
  ['notifications', '/en/notifications'],
];
// Public pages, no sign-in: the marketing site, a reviewer's public profile, and a prescription's public verification.
const PUBLIC = [
  ['home', '/en'],
  ['doctors', '/en/doctors'],
  ['specialties', '/en/specialties'],
  ['for-doctors', '/en/for-doctors'],
  ['how-it-works', '/en/how-it-works'],
  ['public-patient', `/en/patients/${IDS.patient03}`],
  ['verify-prescription', `/en/verify-prescription/${IDS.rxCode}`],
];

// The shared EmptyState component (shared/ui/empty-state.tsx) has no test id: match its markup -- a centred
// column whose prose block starts with the title paragraph.
const collectEmptyStates = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('main div.items-center.text-center > div.max-w-prose > p:first-child')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.textContent.trim())
      .filter(Boolean),
  );
const DOCTOR_LIGHT = [['dashboard', '/en/doctor'], ['appointments', '/en/doctor/appointments'], ['patients', '/en/doctor/patients'], ['earnings', '/en/doctor/earnings']];
const PATIENT_LIGHT = [['dashboard', '/en/patient'], ['appointments', '/en/patient/appointments'], ['records', '/en/patient/records'], ['prescriptions', '/en/patient/prescriptions']];

const ROLE_HOME = { doctor: /\/en\/doctor(\/|$)/, patient: /\/en\/patient(\/|$)/, admin: /\/en\/admin(\/|$)/, hospitaladmin: /\/en\/dashboard(\/|$)/ };

// The backend's global throttle allows 100 requests/minute per IP. Every screen
// fires 10-20 API calls, so screens are paced against a rolling one-minute count.
const apiCalls = [];
async function paceForApi(budget = 55) {
  for (;;) {
    const cutoff = Date.now() - 60_000;
    while (apiCalls.length && apiCalls[0] < cutoff) apiCalls.shift();
    if (apiCalls.length < budget) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// POST /auth/login and /auth/refresh each allow 5 calls/minute per IP: space sign-ins out.
let lastLogin = 0;
async function paceLogin() {
  const wait = lastLogin + 13_000 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastLogin = Date.now();
}

async function walk(browser, account, pages, { screenshots, mobile, deepTabs = screenshots }) {
  const role = account.startsWith('doctor') ? 'doctor' : account.startsWith('patient') ? 'patient' : account;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'Africa/Cairo' });
  const page = await context.newPage();
  const issues = [];
  const known = [];
  let throttled = 0;
  let current = 'login';
  page.on('console', (message) => {
    // Failed network calls are recorded precisely from the response handler; skip the browser's generic echo of them.
    if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) issues.push(`[${current}] console: ${message.text().slice(0, 200)}`);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (!url.startsWith(API)) return;
    apiCalls.push(Date.now());
    const status = response.status();
    if (status < 400) return;
    const entry = `[${current}] HTTP ${status} ${response.request().method()} ${url.replace(API, '')}`;
    if (status === 429) throttled += 1;
    // Product behaviour, not data: the silent session check before sign-in, and a patient's shell asking for its doctor profile.
    else if ((status === 401 && current === 'login') || (status === 404 && role === 'patient' && /\/doctors\/me$/.test(url))) known.push(entry);
    else issues.push(entry);
  });

  await paceForApi();
  await paceLogin();
  await page.goto(`${APP}/en/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  let landed = false;
  // The form can hydrate after the first keystrokes and reset them: retry until the values stick.
  for (let attempt = 0; attempt < 3 && !landed; attempt += 1) {
    if (!(await page.locator('input[type=email]').isVisible().catch(() => false))) {
      landed = await page.waitForURL(ROLE_HOME[role], { timeout: 120_000, waitUntil: 'commit' }).then(() => true).catch(() => false);
      break;
    }
    await page.locator('input[type=email]').fill(`${account}@orivex.dev`);
    await page.locator('input[type=password]').fill(PASSWORD);
    await page.waitForTimeout(400);
    if ((await page.locator('input[type=email]').inputValue()) !== `${account}@orivex.dev`) continue;
    await page.locator('button[type=submit]').click();
    landed = await page.waitForURL(ROLE_HOME[role], { timeout: 120_000, waitUntil: 'commit' }).then(() => true).catch(() => false);
  }
  const result = { account, landedOn: page.url().replace(APP, ''), roleRedirect: landed, pages: [], issues, known };
  if (!landed) {
    await page.screenshot({ path: path.join(OUT, `${account}-login-failed.png`) });
    await context.close();
    return result;
  }
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  const visit = async (name, route) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      current = name;
      const before = issues.length;
      const throttledBefore = throttled;
      await paceForApi();
      // In-app navigation, as a user clicking through the workspace would: a full reload per screen re-runs the
      // session bootstrap (POST /auth/refresh, limited to 5/min per IP) and signs the walkthrough out.
      const target = new URL(route, APP);
      await page.evaluate((href) => window.next.router.push(href), target.pathname + target.search);
      await page.waitForURL((url) => url.pathname === target.pathname, { timeout: 30_000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
      // "Loaded" means the data rendered: every skeleton placeholder is gone.
      const settled = await page
        .waitForFunction(() => document.querySelectorAll('.skeleton').length === 0, null, { timeout: 25_000 })
        .then(() => true)
        .catch(() => false);
      await page.waitForTimeout(800);
      if (!settled && throttled === throttledBefore) issues.push(`[${name}] still showing loading skeletons after 25s`);
      if (throttled > throttledBefore && attempt === 0) {
        // Rate-limited by the test's own pace: wait the window out and load the screen again.
        issues.length = before;
        await new Promise((resolve) => setTimeout(resolve, 62_000));
        continue;
      }
      if (throttled > throttledBefore) issues.push(`[${name}] still rate-limited after a retry`);
      return before;
    }
    return issues.length;
  };

  for (const [name, route] of pages) {
    const before = await visit(name, route);
    const brokenImages = await page.evaluate(() =>
      [...document.images].filter((img) => img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')).map((img) => img.src),
    );
    for (const src of brokenImages) issues.push(`[${name}] broken image ${src.slice(0, 120)}`);
    const text = await page.locator('main').innerText().catch(() => '');
    if (/Access restricted|Something went wrong|Page not found|could not be found|Sign in required/i.test(text) || text.length === 0) issues.push(`[${name}] error page: ${text.slice(0, 80).replace(/\s+/g, ' ')}`);
    const empties = await collectEmptyStates(page);
    if (screenshots) await page.screenshot({ path: path.join(OUT, `${account}-${name}.png`), fullPage: true });
    // Every tab on the screen, as a user would click through them.
    const tabs = [];
    if (deepTabs) {
      const labels = await page.locator('main [role=tab]').allInnerTexts().catch(() => []);
      for (const [index, label] of labels.slice(0, 8).entries()) {
        const tab = page.locator('main [role=tab]').nth(index);
        if ((await tab.getAttribute('aria-selected')) === 'true' || (await tab.isDisabled().catch(() => true))) continue;
        current = `${name}#${label.trim()}`;
        await paceForApi();
        await tab.click().catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
        await page.waitForFunction(() => document.querySelectorAll('.skeleton').length === 0, null, { timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(500);
        const tabEmpties = await collectEmptyStates(page);
        tabs.push({ tab: label.trim().replace(/s+/g, ' '), empties: tabEmpties });
        if (screenshots) await page.screenshot({ path: path.join(OUT, `${account}-${name}-tab${index}.png`), fullPage: true });
      }
    }
    result.pages.push({ name, route, ok: issues.length === before, chars: text.length, empties, tabs });
  }

  if (mobile) {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const [name, route] of pages.slice(0, 4)) {
      await visit(`mobile-${name}`, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (overflow) issues.push(`[mobile-${name}] horizontal scroll at 375 px`);
      await page.screenshot({ path: path.join(OUT, `${account}-mobile-${name}.png`), fullPage: true });
    }
  }
  await context.close();
  return result;
}

async function walkPublic(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'Africa/Cairo' });
  const page = await context.newPage();
  const result = { account: 'public', roleRedirect: true, pages: [], issues: [], known: [] };
  page.on('response', (response) => {
    if (response.url().startsWith(API) && response.status() >= 400 && response.status() !== 401) result.issues.push(`HTTP ${response.status()} ${response.url().replace(API, '')}`);
  });
  for (const [name, route] of PUBLIC) {
    await paceForApi();
    await page.goto(`${APP}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelectorAll('.skeleton').length === 0, null, { timeout: 25_000 }).catch(() => {});
    await page.waitForTimeout(800);
    const text = await page.locator('body').innerText().catch(() => '');
    if (/Something went wrong|Page not found|could not be found/i.test(text)) result.issues.push(`[${name}] error page`);
    result.pages.push({ name, route, ok: true, chars: text.length, empties: await collectEmptyStates(page), tabs: [] });
    await page.screenshot({ path: path.join(OUT, `public-${name}.png`), fullPage: true });
  }
  await context.close();
  return result;
}

const args = process.argv.slice(2);
const mode = args[0] ?? 'all';
const plan = [];
if (mode === 'all' || mode === 'reference') {
  plan.push(['doctor03', DOCTOR_DEEP, { screenshots: true, mobile: true }]);
  plan.push(['patient03', PATIENT_DEEP, { screenshots: true, mobile: true }]);
  plan.push(['admin', ADMIN_DEEP, { screenshots: true, mobile: false }]);
}
if (mode === 'all' || mode === 'others') {
  for (const key of doctors.filter((d) => d !== 'doctor03')) plan.push([key, DOCTOR_LIGHT, { screenshots: false, mobile: false }]);
  for (const key of patients.filter((p) => p !== 'patient03')) plan.push([key, PATIENT_LIGHT, { screenshots: false, mobile: false }]);
  plan.push(['hospitaladmin', [['dashboard', '/en/dashboard']], { screenshots: true, mobile: false }]);
}
if (!['all', 'reference', 'others', 'public'].includes(mode)) {
  for (const key of args) {
    const pages = key.startsWith('doctor') ? DOCTOR_DEEP : key.startsWith('patient') ? PATIENT_DEEP : key === 'admin' ? ADMIN_DEEP : [['dashboard', '/en/dashboard']];
    plan.push([key, pages, { screenshots: true, mobile: false }]);
  }
}

const browser = await chromium.launch();
const results = [];
if (mode === 'all' || mode === 'reference' || mode === 'public') {
  const result = await walkPublic(browser);
  results.push(result);
  console.log(`${result.issues.length === 0 ? 'PASS' : 'FAIL'}  public         ${result.pages.length} pages`);
  for (const issue of result.issues.slice(0, 12)) console.log(`        - ${issue}`);
}
for (const [account, pages, options] of plan) {
  const started = Date.now();
  const result = await walk(browser, account, pages, options).catch((error) => ({ account, roleRedirect: false, pages: [], issues: [`crashed: ${error.message}`], known: [] }));
  results.push(result);
  const ok = result.roleRedirect && result.issues.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${account.padEnd(14)} ${result.pages.length} pages  ${((Date.now() - started) / 1000).toFixed(0)}s`);
  for (const issue of result.issues.slice(0, 12)) console.log(`        - ${issue}`);
  if (result.known?.length) console.log(`        (known product behaviour: ${[...new Set(result.known.map((k) => k.replace(/^\[[^\]]+\] /, '')))].join('; ')})`);
}
await browser.close();
for (const result of results) {
  for (const p of result.pages ?? []) {
    const lines = [...(p.empties ?? []).map((e) => `${p.name}: ${e}`), ...(p.tabs ?? []).flatMap((t) => t.empties.map((e) => `${p.name}#${t.tab}: ${e}`))];
    for (const line of lines) console.log(`EMPTY  ${result.account.padEnd(14)} ${line}`);
  }
}
writeFileSync(path.join(OUT, `results-${mode}.json`), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.roleRedirect || r.issues.length > 0).length;
console.log(`\n${results.length - failed}/${results.length} accounts clean. Screenshots and results.json in ${OUT}`);
process.exitCode = failed > 0 ? 1 : 0;
