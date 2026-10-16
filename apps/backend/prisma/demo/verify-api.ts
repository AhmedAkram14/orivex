/**
 * Demo timeline -- API verification against a RUNNING backend.
 *
 *   API_BASE_URL=http://localhost:4000 npm run demo:verify-api
 *
 * Logs in as every demo account through the real POST /auth/login, calls the
 * endpoints behind each screen and asserts they answer 200 with non-empty,
 * internally consistent data (cross-checked against the database), then runs
 * authorisation-negative checks (another patient's prescription PDF and
 * document, a non-patient's chart, admin endpoints as non-admins).
 *
 * Local only: refuses a non-local DATABASE_URL or API_BASE_URL.
 */
import { PrismaClient } from '@prisma/client';

import { DEMO_PASSWORD } from '../demo-data/demo-people.js';

import { DEMO_ADMIN_EMAIL, DEMO_DOCTOR_EMAILS, DEMO_PATIENT_EMAILS, MS_PER_DAY, assertSafeDatabase } from './core.js';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:4000';
const host = new URL(BASE).hostname;
if (host !== 'localhost' && host !== '127.0.0.1') throw new Error(`Refusing to verify against non-local API "${BASE}".`);
assertSafeDatabase(process.env.DATABASE_URL, false);

const prisma = new PrismaClient();

interface Result {
  account: string;
  check: string;
  ok: boolean;
  detail?: string;
}
const results: Result[] = [];

// The global throttler allows 100 requests/minute per IP: pace and back off on 429.
let lastRequest = 0;
async function call(token: string | null, path: string, init: RequestInit = {}): Promise<{ status: number; body: unknown; contentType: string; bytes: number }> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const wait = lastRequest + 650 - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequest = Date.now();
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (response.status === 429) {
      const retry = Number(response.headers.get('retry-after') ?? '10');
      await new Promise((resolve) => setTimeout(resolve, Math.max(5, retry) * 1000));
      continue;
    }
    const contentType = response.headers.get('content-type') ?? '';
    const buffer = Buffer.from(await response.arrayBuffer());
    let body: unknown = null;
    if (contentType.includes('json')) body = JSON.parse(buffer.toString('utf8') || 'null');
    return { status: response.status, body, contentType, bytes: buffer.length };
  }
  throw new Error(`Rate limited repeatedly on ${path}`);
}

const data = (body: unknown): unknown => (body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body);
function list(value: unknown): unknown[] {
  const inner = data(value);
  if (Array.isArray(inner)) return inner;
  if (inner && typeof inner === 'object') {
    for (const key of ['reviews', 'items', 'entries', 'results', 'data', 'accounts', 'transactions', 'threads', 'articles', 'notifications']) {
      const candidate = (inner as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) return candidate;
    }
  }
  return [];
}

function record(account: string, check: string, ok: boolean, detail?: string): void {
  results.push({ account, check, ok, detail });
}

async function expectOk(account: string, token: string, path: string, options: { nonEmpty?: boolean; check?: (body: unknown) => string | null } = {}): Promise<unknown> {
  const response = await call(token, path);
  if (response.status !== 200) {
    record(account, path, false, `HTTP ${response.status} ${JSON.stringify(response.body)?.slice(0, 160)}`);
    return null;
  }
  if (options.nonEmpty && list(response.body).length === 0) {
    record(account, path, false, 'empty list');
    return response.body;
  }
  const problem = options.check?.(response.body) ?? null;
  record(account, path, problem === null, problem ?? undefined);
  return response.body;
}

async function login(email: string): Promise<string> {
  const response = await call(null, '/auth/login', { method: 'POST', body: JSON.stringify({ email, password: DEMO_PASSWORD }) });
  const token = (data(response.body) as { accessToken?: string } | null)?.accessToken;
  if (response.status !== 200 && response.status !== 201) throw new Error(`login ${email}: HTTP ${response.status}`);
  if (!token) throw new Error(`login ${email}: no access token`);
  return token;
}

const iso = (date: Date): string => date.toISOString();

async function verifyDoctor(email: string): Promise<void> {
  const key = email.split('@')[0];
  const token = await login(email);
  record(key, 'login', true);
  const account = await prisma.account.findUniqueOrThrow({ where: { email }, include: { doctorProfile: true } });
  const doctorId = account.doctorProfile!.id;
  const now = new Date();

  await expectOk(key, token, '/appointments/doctor/dashboard-summary');
  await expectOk(key, token, '/appointments/doctor/upcoming-work');
  await expectOk(key, token, '/appointments/doctor/queue');
  await expectOk(key, token, `/appointments/doctor/schedule?from=${iso(new Date(now.getTime() - 7 * MS_PER_DAY))}&to=${iso(new Date(now.getTime() + 21 * MS_PER_DAY))}`, { nonEmpty: true });

  const expectedPatients = new Set((await prisma.appointment.findMany({ where: { doctorId }, select: { patientId: true } })).map((a) => a.patientId)).size;
  await expectOk(key, token, '/appointments/doctor/patients', {
    nonEmpty: true,
    check: (body) => (list(body).length === expectedPatients ? null : `patients list ${list(body).length} vs ${expectedPatients} in DB`),
  });
  await expectOk(key, token, '/appointments/doctor/pending-approval');
  for (const days of [7, 30, 90, 270]) {
    const range = `dateFrom=${iso(new Date(now.getTime() - days * MS_PER_DAY))}&dateTo=${iso(now)}`;
    await expectOk(key, token, `/appointments/doctor/reports-summary?${range}`);
    await expectOk(key, token, `/appointments/doctor/reports-analytics?${range}&comparePrevious=true`);
  }

  // Earnings reconcile with the payments table (15% commission on SUCCEEDED/SETTLED).
  const earned = await prisma.paymentTransaction.findMany({ where: { doctorId, status: { in: ['SUCCEEDED', 'SETTLED'] } } });
  const gross = Math.round(earned.reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100;
  await expectOk(key, token, '/payments/doctor/earnings-summary', {
    check: (body) => {
      const summary = data(body) as { lifetimeGrossAmount?: number; lifetimeTransactionCount?: number };
      if (summary.lifetimeTransactionCount !== earned.length) return `lifetime count ${summary.lifetimeTransactionCount} vs ${earned.length} payments`;
      if (Math.abs((summary.lifetimeGrossAmount ?? 0) - gross) > 0.01) return `gross ${summary.lifetimeGrossAmount} vs ${gross}`;
      return null;
    },
  });
  const ninety = `dateFrom=${iso(new Date(now.getTime() - 90 * MS_PER_DAY))}&dateTo=${iso(now)}`;
  const isFree = earned.length === 0;
  await expectOk(key, token, `/payments/doctor/earnings-summary?${ninety}`, {
    check: (body) => (isFree || ((data(body) as { cycles?: unknown[] }).cycles ?? []).length >= 2 ? null : 'fewer than 2 monthly cycles in 90 days'),
  });
  await expectOk(key, token, `/payments/doctor/earnings-transactions?${ninety}`, { nonEmpty: !isFree });

  await expectOk(key, token, '/scheduling/doctor-availability', { nonEmpty: true });
  await expectOk(key, token, '/scheduling/doctor-exceptions', { nonEmpty: true });
  await expectOk(key, token, '/scheduling/upcoming-slots', { nonEmpty: true });
  await expectOk(key, token, '/doctors/me');
  const visibleReviews = await prisma.consultationFeedback.count({ where: { doctorId, moderationStatus: 'VISIBLE' } });
  await expectOk(key, token, `/doctors/${doctorId}/reviews`, {
    check: (body) => (visibleReviews >= 5 && list(body).length === visibleReviews ? null : `API ${list(body).length} vs ${visibleReviews} visible reviews in DB`),
  });
  await expectOk(key, token, '/message-threads', { nonEmpty: true });
  await expectOk(key, token, '/message-threads/unread-count');
  await expectOk(key, token, '/notifications', { nonEmpty: true });
  await expectOk(key, token, '/knowledge/articles/mine');
  await expectOk(key, token, '/disputes');
  await expectOk(key, token, '/search?q=a');

  // Patient chart of this doctor's most-seen patient.
  const top = await prisma.appointment.groupBy({ by: ['patientId'], where: { doctorId, status: 'COMPLETED' }, _count: { _all: true }, orderBy: { _count: { patientId: 'desc' } }, take: 1 });
  const patientId = top[0]?.patientId;
  if (patientId) {
    await expectOk(key, token, `/doctor/patients/${patientId}/profile`);
    await expectOk(key, token, `/doctor/patients/${patientId}/appointments`, { nonEmpty: true });
    await expectOk(key, token, `/doctor/patients/${patientId}/medical-records`, { nonEmpty: true });
    await expectOk(key, token, `/doctor/patients/${patientId}/prescriptions`);
    await expectOk(key, token, `/doctor/patients/${patientId}/documents`);
    await expectOk(key, token, `/doctor/patients/${patientId}/vitals`);
  }

  // A completed consultation's summary, and a prescription PDF + public verification (D1).
  const session = await prisma.consultationSession.findFirst({ where: { appointment: { doctorId }, completionReason: 'COMPLETED', prescriptions: { some: {} } }, include: { prescriptions: true }, orderBy: { closedAt: 'desc' } });
  if (session) {
    await expectOk(key, token, `/consultations/${session.id}/summary`);
    const prescription = session.prescriptions[0];
    const pdf = await call(token, `/prescriptions/${prescription.id}/pdf`);
    record(key, 'prescription pdf', pdf.status === 200 && pdf.contentType.includes('application/pdf') && pdf.bytes > 1000, `HTTP ${pdf.status} ${pdf.contentType} ${pdf.bytes}B`);
    const verify = await call(null, `/prescriptions/verify/${prescription.verificationCode}`);
    record(key, 'prescription verify', verify.status === 200 && (data(verify.body) as { valid?: boolean }).valid === true, `HTTP ${verify.status}`);
  }
}

async function verifyPatient(email: string): Promise<void> {
  const key = email.split('@')[0];
  const token = await login(email);
  record(key, 'login', true);
  const account = await prisma.account.findUniqueOrThrow({ where: { email }, include: { patientProfile: true } });
  const patientId = account.patientProfile!.id;
  const suspended = key === 'patient17';

  await expectOk(key, token, '/patients/me');
  await expectOk(key, token, '/patients/me/dashboard-summary');
  await expectOk(key, token, '/patients/me/upcoming-appointments', { nonEmpty: !suspended });
  await expectOk(key, token, '/patients/me/active-prescriptions');
  await expectOk(key, token, '/patients/me/prescriptions', { nonEmpty: true });
  await expectOk(key, token, '/patients/me/health-dashboard');
  await expectOk(key, token, '/patients/me/medical-records', { nonEmpty: true });
  const documents = await expectOk(key, token, '/patients/me/documents', { nonEmpty: true });
  await expectOk(key, token, '/patients/me/health-passport-entries');
  const appointmentCount = await prisma.appointment.count({ where: { patientId } });
  await expectOk(key, token, '/appointments/me', {
    nonEmpty: true,
    check: (body) => (list(body).length > 0 && list(body).length <= appointmentCount ? null : `${list(body).length} listed vs ${appointmentCount} in DB`),
  });
  await expectOk(key, token, '/message-threads', { nonEmpty: true });
  await expectOk(key, token, '/message-threads/unread-count');
  await expectOk(key, token, '/notifications', { nonEmpty: true });
  await expectOk(key, token, '/waitlist');
  await expectOk(key, token, '/disputes');
  await expectOk(key, token, '/knowledge/articles', { nonEmpty: true });
  await expectOk(key, token, '/knowledge/saved-articles');
  await expectOk(key, token, '/knowledge/followed-doctors');
  await expectOk(key, token, `/patients/${patientId}/health-graph`, { nonEmpty: true });

  // A document actually downloads through its presigned URL.
  const first = list(documents)[0] as { id?: string; signedUrl?: string; downloadUrl?: string; url?: string } | undefined;
  const url = first?.signedUrl ?? first?.downloadUrl ?? first?.url;
  if (url) {
    const object = await fetch(url);
    record(key, 'document download', object.status === 200, `HTTP ${object.status} ${object.headers.get('content-type')}`);
  } else if (first?.id) {
    const asset = await call(token, `/media-assets/${first.id}`);
    const signed = (data(asset.body) as { signedUrl?: string } | null)?.signedUrl;
    const object = signed ? await fetch(signed) : null;
    record(key, 'document download', object?.status === 200, `asset HTTP ${asset.status}, object HTTP ${object?.status}`);
  }

  const prescription = await prisma.prescription.findFirst({ where: { consultationSession: { appointment: { patientId } } }, orderBy: { signedAt: 'desc' } });
  if (prescription) {
    const pdf = await call(token, `/prescriptions/${prescription.id}/pdf`);
    record(key, 'prescription pdf', pdf.status === 200 && pdf.contentType.includes('application/pdf'), `HTTP ${pdf.status} ${pdf.contentType} ${pdf.bytes}B`);
  }
}

async function verifyAdmin(): Promise<void> {
  const key = 'admin';
  const token = await login(DEMO_ADMIN_EMAIL);
  record(key, 'login', true);
  const now = new Date();
  const range = `dateFrom=${iso(new Date(now.getTime() - 90 * MS_PER_DAY))}&dateTo=${iso(now)}`;
  await expectOk(key, token, '/admin/kpis');
  for (const section of ['kpis', 'appointments', 'doctors', 'patients', 'payments', 'telemedicine', 'verification', 'notifications']) {
    await expectOk(key, token, `/admin/analytics/${section}?${range}`);
  }
  await expectOk(key, token, '/admin/payments', { nonEmpty: true });
  await expectOk(key, token, '/admin/verification-queue');
  await expectOk(key, token, '/admin/audit-log');
  await expectOk(key, token, '/admin/reviews?status=flagged');
  await expectOk(key, token, '/admin/disputes');
  await expectOk(key, token, '/admin/knowledge/articles');
  await expectOk(key, token, '/admin/accounts', { nonEmpty: true });
  await expectOk(key, token, '/admin/hospitals', { nonEmpty: true });
}

async function verifyAuthorization(): Promise<void> {
  const patientA = DEMO_PATIENT_EMAILS[2]; // patient03
  const patientB = DEMO_PATIENT_EMAILS[5]; // patient06
  const tokenA = await login(patientA);
  const b = await prisma.account.findUniqueOrThrow({ where: { email: patientB }, include: { patientProfile: true } });
  const prescriptionB = await prisma.prescription.findFirst({ where: { consultationSession: { appointment: { patientId: b.patientProfile!.id } } } });
  if (prescriptionB) {
    const response = await call(tokenA, `/prescriptions/${prescriptionB.id}/pdf`);
    record('authz', 'patient03 -> patient06 prescription PDF denied', response.status === 404 || response.status === 403, `HTTP ${response.status}`);
    const json = await call(tokenA, `/prescriptions/${prescriptionB.id}`);
    record('authz', 'patient03 -> patient06 prescription denied', json.status === 404 || json.status === 403, `HTTP ${json.status}`);
  }
  const documentB = await prisma.mediaAsset.findFirst({ where: { ownerAccountId: b.id, purpose: { in: ['lab_report', 'clinical_attachment'] } } });
  if (documentB) {
    const response = await call(tokenA, `/media-assets/${documentB.id}`);
    record('authz', 'patient03 -> patient06 document denied', response.status === 404 || response.status === 403, `HTTP ${response.status}`);
  }
  const chart = await call(tokenA, `/doctor/patients/${b.patientProfile!.id}/profile`);
  record('authz', 'patient -> doctor chart endpoint denied', chart.status === 403 || chart.status === 401, `HTTP ${chart.status}`);

  // A doctor who never saw a patient cannot open that patient's chart.
  for (const doctorEmail of DEMO_DOCTOR_EMAILS) {
    const doctor = await prisma.account.findUniqueOrThrow({ where: { email: doctorEmail }, include: { doctorProfile: true } });
    const seen = new Set((await prisma.appointment.findMany({ where: { doctorId: doctor.doctorProfile!.id }, select: { patientId: true } })).map((a) => a.patientId));
    const stranger = await prisma.patientProfile.findFirst({ where: { id: { notIn: [...seen] }, account: { email: { in: DEMO_PATIENT_EMAILS } } } });
    if (!stranger) continue;
    const token = await login(doctorEmail);
    const response = await call(token, `/doctor/patients/${stranger.id}/profile`);
    record('authz', `${doctorEmail.split('@')[0]} -> unrelated patient chart denied`, response.status === 403 || response.status === 404, `HTTP ${response.status}`);
    const admin = await call(token, '/admin/kpis');
    record('authz', 'doctor -> /admin/kpis denied', admin.status === 403, `HTTP ${admin.status}`);
    break;
  }
  const admin = await call(tokenA, '/admin/kpis');
  record('authz', 'patient -> /admin/kpis denied', admin.status === 403, `HTTP ${admin.status}`);
}

async function main(): Promise<void> {
  const only = process.argv.slice(2);
  const want = (key: string): boolean => only.length === 0 || only.includes(key);
  for (const email of DEMO_DOCTOR_EMAILS) if (want(email.split('@')[0]) || want('doctors')) await verifyDoctor(email).catch((error) => record(email, 'run', false, String(error)));
  for (const email of DEMO_PATIENT_EMAILS) if (want(email.split('@')[0]) || want('patients')) await verifyPatient(email).catch((error) => record(email, 'run', false, String(error)));
  if (want('admin')) await verifyAdmin().catch((error) => record('admin', 'run', false, String(error)));
  if (want('authz')) await verifyAuthorization().catch((error) => record('authz', 'run', false, String(error)));

  const byAccount = new Map<string, Result[]>();
  for (const result of results) byAccount.set(result.account, [...(byAccount.get(result.account) ?? []), result]);
  let failed = 0;
  for (const [account, rows] of byAccount) {
    const bad = rows.filter((row) => !row.ok);
    failed += bad.length;
    console.info(`${bad.length === 0 ? 'PASS' : 'FAIL'}  ${account.padEnd(12)} ${rows.length - bad.length}/${rows.length}`);
    for (const row of bad) console.info(`      - ${row.check}: ${row.detail ?? ''}`);
  }
  console.info(`\n${results.length - failed}/${results.length} API checks passed.`);
  await prisma.$disconnect();
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
