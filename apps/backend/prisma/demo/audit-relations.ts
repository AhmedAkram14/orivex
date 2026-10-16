/**
 * Demo timeline -- relationship audit against a RUNNING backend.
 *
 *   API_BASE_URL=http://localhost:4000 npm run demo:audit-relations
 *
 * For doctor03 <-> patient03 and the four other busiest doctor/patient pairs,
 * follows the chain appointment -> payment -> session -> SOAP note ->
 * prescription -> PDF/public verification -> documents -> messages ->
 * notifications -> review, and checks that what the doctor's API shows, what
 * the patient's API shows and what the database holds are the same records.
 * Every check is read-only. Local only.
 */
import { PrismaClient } from '@prisma/client';

import { DEMO_PASSWORD } from '../demo-data/demo-people.js';

import { assertSafeDatabase } from './core.js';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:4000';
const host = new URL(BASE).hostname;
if (host !== 'localhost' && host !== '127.0.0.1') throw new Error(`Refusing to audit against non-local API "${BASE}".`);
assertSafeDatabase(process.env.DATABASE_URL, false);

const prisma = new PrismaClient();
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

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
      await new Promise((resolve) => setTimeout(resolve, Math.max(5, Number(response.headers.get('retry-after') ?? '10')) * 1000));
      continue;
    }
    const contentType = response.headers.get('content-type') ?? '';
    const buffer = Buffer.from(await response.arrayBuffer());
    const body: unknown = contentType.includes('json') ? JSON.parse(buffer.toString('utf8') || 'null') : null;
    return { status: response.status, body, contentType, bytes: buffer.length };
  }
  throw new Error(`Rate limited repeatedly on ${path}`);
}

async function login(email: string): Promise<string> {
  const response = await call(null, '/auth/login', { method: 'POST', body: JSON.stringify({ email, password: DEMO_PASSWORD }) });
  const token = (response.body as { data?: { accessToken?: string } } | null)?.data?.accessToken;
  if (!token) throw new Error(`login ${email}: HTTP ${response.status}`);
  return token;
}

/** Every UUID anywhere in a response body -- robust to each endpoint's own envelope shape. */
async function idsAt(token: string, path: string): Promise<{ status: number; ids: Set<string> }> {
  const response = await call(token, path);
  return { status: response.status, ids: new Set(JSON.stringify(response.body ?? '').match(UUID) ?? []) };
}

const rows: { pair: string; link: string; ok: boolean; detail: string }[] = [];
function check(pair: string, link: string, ok: boolean, detail: string): void {
  rows.push({ pair, link, ok, detail });
}
const missing = (expected: string[], seen: Set<string>): string[] => expected.filter((id) => !seen.has(id));

async function auditPair(doctorEmail: string, patientEmail: string): Promise<void> {
  const pair = `${doctorEmail.split('@')[0]} <-> ${patientEmail.split('@')[0]}`;
  const doctor = await prisma.doctorProfile.findFirstOrThrow({ where: { account: { email: doctorEmail } }, include: { account: true } });
  const patient = await prisma.patientProfile.findFirstOrThrow({ where: { account: { email: patientEmail } }, include: { account: true } });
  const appointments = await prisma.appointment.findMany({
    where: { doctorId: doctor.id, patientId: patient.id },
    include: { consultationSession: { include: { clinicalNotes: true, prescriptions: true, paymentTransactions: true, consultationFeedback: true } } },
    orderBy: { scheduledAt: 'asc' },
  });
  const sessions = appointments.flatMap((a) => (a.consultationSession ? [a.consultationSession] : []));
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const doctorToken = await login(doctorEmail);
  const patientToken = await login(patientEmail);

  // 1. Appointments: both sides list exactly the pair's appointments.
  const apptIds = appointments.map((a) => a.id);
  const doctorView = await idsAt(doctorToken, `/doctor/patients/${patient.id}/appointments`);
  const patientView = await idsAt(patientToken, '/appointments/me?limit=100');
  const doctorMissing = missing(apptIds, doctorView.ids);
  const patientMissing = missing(apptIds, patientView.ids);
  check(pair, 'appointments (doctor chart / patient list / DB)', doctorMissing.length === 0 && patientMissing.length === 0,
    `${apptIds.length} in DB (${completed.length} completed); doctor missing ${doctorMissing.length}, patient missing ${patientMissing.length}`);

  // 2. Every completed visit: a closed, completed session with SOAP notes, readable from both sides.
  let soapBoth = 0;
  for (const appointment of completed) {
    const session = appointment.consultationSession;
    if (!session || session.state !== 'CLOSED' || session.completionReason !== 'COMPLETED' || session.clinicalNotes.length === 0) continue;
    const fromDoctor = await call(doctorToken, `/consultations/${session.id}/summary`);
    const fromPatient = await call(patientToken, `/consultations/${session.id}/summary`);
    const note = session.clinicalNotes[0]!;
    const fragment = (note.assessment ?? note.content).slice(0, 30);
    if (fromDoctor.status === 200 && fromPatient.status === 200 && JSON.stringify(fromDoctor.body).includes(fragment) && JSON.stringify(fromPatient.body).includes(fragment)) soapBoth += 1;
  }
  check(pair, 'session -> SOAP note (summary from both sides contains the note)', soapBoth === completed.length, `${soapBoth}/${completed.length} completed visits`);

  // 3. Payments: every paid visit's payment is reachable from its session and dated at booking.
  const paid = sessions.filter((s) => s.paymentTransactions.length > 0);
  let paymentOk = 0;
  for (const session of paid) {
    const response = await call(doctorToken, `/payments/by-consultation-session/${session.id}`);
    const appointment = appointments.find((a) => a.id === session.appointmentId)!;
    const payment = session.paymentTransactions[0]!;
    if (response.status === 200 && JSON.stringify(response.body).includes(payment.id) && payment.createdAt <= appointment.scheduledAt) paymentOk += 1;
  }
  const earnings = await idsAt(doctorToken, '/payments/doctor/earnings-transactions?dateFrom=2025-01-01T00:00:00.000Z');
  const settled = paid.flatMap((s) => s.paymentTransactions).filter((p) => p.status === 'SUCCEEDED' || p.status === 'SETTLED');
  const earningsMissing = settled.filter((p) => !earnings.ids.has(p.id) && !earnings.ids.has(p.appointmentId ?? ''));
  check(pair, 'appointment -> payment (by session; doctor earnings)', paymentOk === paid.length && earningsMissing.length === 0,
    `${paymentOk}/${paid.length} payments via session; ${earningsMissing.length} settled missing from doctor earnings`);

  // 4. Prescriptions: same ids both sides; PDF downloads for both; public verification answers.
  const prescriptions = sessions.flatMap((s) => s.prescriptions);
  const doctorRx = await idsAt(doctorToken, `/doctor/patients/${patient.id}/prescriptions`);
  const patientRx = await idsAt(patientToken, '/patients/me/prescriptions');
  const rxIds = prescriptions.map((p) => p.id);
  let pdfBoth = 0;
  let verified = 0;
  for (const prescription of prescriptions.slice(-3)) {
    const a = await call(doctorToken, `/prescriptions/${prescription.id}/pdf`);
    const b = await call(patientToken, `/prescriptions/${prescription.id}/pdf`);
    if (a.status === 200 && b.status === 200 && a.contentType.includes('pdf') && b.contentType.includes('pdf')) pdfBoth += 1;
    if (prescription.verificationCode) {
      const v = await call(null, `/prescriptions/verify/${prescription.verificationCode}`);
      if (v.status === 200) verified += 1;
    }
  }
  const sampled = Math.min(3, prescriptions.length);
  check(pair, 'SOAP -> prescription -> PDF + public verification',
    missing(rxIds, doctorRx.ids).length === 0 && missing(rxIds, patientRx.ids).length === 0 && pdfBoth === sampled && verified === sampled,
    `${rxIds.length} prescriptions; doctor missing ${missing(rxIds, doctorRx.ids).length}, patient missing ${missing(rxIds, patientRx.ids).length}; PDF both sides ${pdfBoth}/${sampled}; verified ${verified}/${sampled}`);

  // 5. Documents: what the doctor sees in the chart is the patient's own document list.
  const doctorDocs = await idsAt(doctorToken, `/doctor/patients/${patient.id}/documents`);
  const patientDocs = await idsAt(patientToken, '/patients/me/documents');
  const ownedDocs = await prisma.mediaAsset.findMany({ where: { ownerAccountId: patient.accountId, status: 'confirmed', purpose: { in: ['clinical_attachment', 'lab_report'] } }, select: { id: true } });
  const docIds = ownedDocs.map((d) => d.id);
  check(pair, 'documents (doctor chart / patient records / DB)', missing(docIds, patientDocs.ids).length === 0 && missing(docIds, doctorDocs.ids).length === 0,
    `${docIds.length} in DB; patient missing ${missing(docIds, patientDocs.ids).length}; doctor missing ${missing(docIds, doctorDocs.ids).length} (doctor HTTP ${doctorDocs.status})`);

  // 6. Messages: the pair's thread and every message in it, on both sides.
  const thread = await prisma.messageThread.findFirst({ where: { doctorId: doctor.id, patientId: patient.id }, include: { messages: { select: { id: true } } } });
  if (thread) {
    const messageIds = thread.messages.map((m) => m.id);
    const a = await idsAt(doctorToken, `/message-threads/${thread.id}/messages?limit=100`);
    const b = await idsAt(patientToken, `/message-threads/${thread.id}/messages?limit=100`);
    const listA = await idsAt(doctorToken, '/message-threads');
    const listB = await idsAt(patientToken, '/message-threads');
    check(pair, 'messages (thread + messages on both sides)', listA.ids.has(thread.id) && listB.ids.has(thread.id) && missing(messageIds, a.ids).length === 0 && missing(messageIds, b.ids).length === 0,
      `${messageIds.length} messages; doctor missing ${missing(messageIds, a.ids).length}, patient missing ${missing(messageIds, b.ids).length}`);
  } else {
    check(pair, 'messages (thread + messages on both sides)', true, 'no thread for this pair (none seeded)');
  }

  // 7. Notifications: each side's feed points at this pair's real appointments, never at a missing entity.
  const notifications = await prisma.notification.findMany({ where: { accountId: { in: [doctor.accountId, patient.accountId] }, entityId: { in: apptIds } }, select: { id: true, accountId: true } });
  const doctorFeed = await idsAt(doctorToken, '/notifications?limit=100');
  const patientFeed = await idsAt(patientToken, '/notifications?limit=100');
  const notifMissing = notifications.filter((n) => !(n.accountId === doctor.accountId ? doctorFeed.ids : patientFeed.ids).has(n.id));
  // The feeds are paginated (newest first), so older ones are legitimately off the first page.
  check(pair, 'notifications (pair appointments in each feed)', notifications.length > 0 && notifMissing.length < notifications.length,
    `${notifications.length} about this pair's appointments; ${notifications.length - notifMissing.length} visible in the first page of the feeds`);

  // 8. Review: a review only exists for a completed visit by this patient, and a visible one shows on the doctor's profile.
  const reviews = sessions.flatMap((s) => (s.consultationFeedback ? [s.consultationFeedback] : []));
  const publicReviews = { ids: new Set<string>() };
  for (let page = 1; page <= 10; page += 1) {
    const { ids } = await idsAt(patientToken, `/doctors/${doctor.id}/reviews?page=${page}&limit=100`);
    const before = publicReviews.ids.size;
    for (const id of ids) publicReviews.ids.add(id);
    if (publicReviews.ids.size === before) break;
  }
  const visible = reviews.filter((r) => r.moderationStatus === 'VISIBLE');
  const orphan = reviews.filter((r) => !completed.some((a) => a.consultationSession?.id === r.consultationSessionId));
  check(pair, 'completed visit -> review (public profile)', orphan.length === 0 && missing(visible.map((r) => r.id), publicReviews.ids).length === 0,
    `${reviews.length} reviews (${visible.length} visible); ${missing(visible.map((r) => r.id), publicReviews.ids).length} visible missing from profile; ${orphan.length} not tied to a completed visit`);
}

async function main(): Promise<void> {
  const busiest = await prisma.$queryRaw<{ doctor: string; patient: string; visits: bigint }[]>`
    SELECT da.email AS doctor, pa.email AS patient, count(*) AS visits
    FROM "Appointment" a
    JOIN "DoctorProfile" dp ON dp.id = a."doctorId" JOIN "Account" da ON da.id = dp."accountId"
    JOIN "PatientProfile" pp ON pp.id = a."patientId" JOIN "Account" pa ON pa.id = pp."accountId"
    WHERE a.status = 'COMPLETED' AND da.email <> 'doctor03@orivex.dev' AND pa.email <> 'patient03@orivex.dev'
    GROUP BY 1, 2 ORDER BY 3 DESC, 1, 2`;
  const pairs: [string, string][] = [['doctor03@orivex.dev', 'patient03@orivex.dev']];
  const usedDoctors = new Set<string>();
  const usedPatients = new Set<string>();
  for (const row of busiest) {
    if (pairs.length >= 5) break;
    if (usedDoctors.has(row.doctor) || usedPatients.has(row.patient)) continue;
    usedDoctors.add(row.doctor);
    usedPatients.add(row.patient);
    pairs.push([row.doctor, row.patient]);
  }
  for (const [doctorEmail, patientEmail] of pairs) {
    try {
      await auditPair(doctorEmail, patientEmail);
    } catch (error) {
      check(`${doctorEmail} <-> ${patientEmail}`, 'audit', false, (error as Error).message);
    }
  }
  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'}  ${row.pair.padEnd(24)} ${row.link.padEnd(66)} ${row.detail}`);
  const failed = rows.filter((row) => !row.ok).length;
  console.log(`\n${rows.length - failed}/${rows.length} relationship checks passed across ${pairs.length} pairs.`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
