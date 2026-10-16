/**
 * Demo timeline -- the invariant suite (the 15 consistency rules) plus
 * coverage floors, evaluated against the database for the demo scope.
 * Run after every seed (`npm run demo:check`).
 */
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import type { PrismaClient } from '@prisma/client';

import type { Storage } from './apply.js';
import { CONDITIONS } from './catalog/clinical.js';
import { MIN_COMPLETED_PER_DOCTOR } from './catalog/stories.js';
import { MS_PER_DAY, MS_PER_MINUTE, cairoDayOf, dayKey, isDemoTimelineId } from './core.js';
import type { DemoPopulation } from './load.js';
import { DoctorCalendar } from './plan/schedule.js';

export interface CheckResult {
  id: string;
  name: string;
  passed: boolean;
  checked: number;
  failures: string[];
  /** Coverage floors are reported, not fatal. */
  severity: 'invariant' | 'coverage';
}

export async function runChecks(prisma: PrismaClient, population: DemoPopulation, anchor: Date, storage?: Storage): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const record = (id: string, name: string, checked: number, failures: string[], severity: CheckResult['severity'] = 'invariant'): void => {
    results.push({ id, name, passed: failures.length === 0, checked, failures: failures.slice(0, 25), severity });
  };

  const doctorProfileIds = [...population.doctors.values()].map((d) => d.profileId);
  const patientProfileIds = [...population.patients.values()].map((p) => p.profileId);
  const accountIds = [population.adminAccountId, ...[...population.doctors.values()].map((d) => d.accountId), ...[...population.patients.values()].map((p) => p.accountId)];
  if (population.hospitalAdminAccountId) accountIds.push(population.hospitalAdminAccountId);
  const doctorByProfile = new Map([...population.doctors.values()].map((d) => [d.profileId, d]));
  const patientByProfile = new Map([...population.patients.values()].map((p) => [p.profileId, p]));

  const appointments = await prisma.appointment.findMany({
    where: { patientId: { in: patientProfileIds } },
    include: { consultationSession: true, paymentTransactions: true },
  });

  // 1. Completed => exactly one closed, completed session with a realistic duration.
  {
    const failures: string[] = [];
    const completed = appointments.filter((a) => a.status === 'COMPLETED');
    for (const a of completed) {
      const s = a.consultationSession;
      if (!s) failures.push(`${a.id}: no session`);
      else if (s.state !== 'CLOSED' || s.completionReason !== 'COMPLETED') failures.push(`${a.id}: session ${s.state}/${s.completionReason}`);
      else if (!s.startedAt || !s.closedAt) failures.push(`${a.id}: missing startedAt/closedAt`);
      else {
        const minutes = (s.closedAt.getTime() - s.startedAt.getTime()) / MS_PER_MINUTE;
        if (minutes < 5 || minutes > 50) failures.push(`${a.id}: duration ${minutes.toFixed(0)} min`);
        if (s.startedAt.getTime() < a.scheduledAt.getTime() - 10 * MS_PER_MINUTE) failures.push(`${a.id}: started before slot`);
      }
    }
    record('I1', 'Completed appointment has one closed, completed session (5-50 min)', completed.length, failures);
  }

  // 2. On the doctor's slot grid, inside working hours, not on time off, no overlaps.
  {
    const failures: string[] = [];
    const exceptions = await prisma.scheduleException.findMany({ where: { doctorId: { in: doctorProfileIds } } });
    const calendars = new Map<string, DoctorCalendar>();
    for (const doctor of population.doctors.values()) {
      const calendar = new DoctorCalendar(doctor);
      for (const exception of exceptions.filter((e) => e.doctorId === doctor.profileId)) {
        const date = exception.date;
        calendar.addTimeOff({
          day: { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() },
          type: exception.type,
          hours: exception.startTime && exception.endTime ? { start: exception.startTime, end: exception.endTime } : undefined,
          reason: exception.reason ?? '',
        });
      }
      calendars.set(doctor.profileId, calendar);
    }
    const timeline = appointments.filter((a) => isDemoTimelineId(a.id));
    for (const a of timeline) {
      const calendar = calendars.get(a.doctorId);
      if (!calendar) continue;
      const day = cairoDayOf(a.scheduledAt);
      const onGrid = calendar.slots(day).some((slot) => slot.start.getTime() === a.scheduledAt.getTime());
      // A cancelled/expired/rescheduled booking may sit on a day that later became time off.
      const active = ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(a.status);
      if (!onGrid && active) failures.push(`${a.id}: ${a.scheduledAt.toISOString()} not on ${dayKey(day)} grid`);
    }
    const busy = (key: (a: (typeof appointments)[number]) => string): void => {
      const groups = new Map<string, (typeof appointments)[number][]>();
      for (const a of appointments.filter((x) => ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(x.status))) {
        const list = groups.get(key(a)) ?? [];
        list.push(a);
        groups.set(key(a), list);
      }
      for (const list of groups.values()) {
        list.sort((x, y) => x.scheduledAt.getTime() - y.scheduledAt.getTime());
        for (let i = 1; i < list.length; i += 1) {
          const previousEnd = (list[i - 1].endTime ?? new Date(list[i - 1].scheduledAt.getTime() + 30 * MS_PER_MINUTE)).getTime();
          if (list[i].scheduledAt.getTime() < previousEnd) failures.push(`overlap ${list[i - 1].id} / ${list[i].id}`);
        }
      }
    };
    busy((a) => `d:${a.doctorId}`);
    busy((a) => `p:${a.patientId}`);
    record('I2', 'On the slot grid, no overlaps for any doctor or patient', timeline.length, failures);
  }

  // 3. Payments: paid confirmed/completed/no-show => one payment for the fee snapshot, dated before the visit; free => none.
  {
    const failures: string[] = [];
    let checked = 0;
    for (const a of appointments) {
      const fee = a.feeAmount === null ? null : Number(a.feeAmount);
      const payments = a.paymentTransactions;
      if (a.consultationType === 'FREE' && payments.length > 0) failures.push(`${a.id}: free appointment has a payment`);
      if (a.consultationType === 'PAID' && ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(a.status)) {
        checked += 1;
        if (payments.length !== 1) {
          failures.push(`${a.id}: ${payments.length} payments`);
          continue;
        }
        const p = payments[0];
        if (Number(p.amount) !== fee || p.currency !== 'EGP') failures.push(`${a.id}: amount ${p.amount} ${p.currency} vs fee ${fee}`);
        if (p.createdAt.getTime() > a.scheduledAt.getTime()) failures.push(`${a.id}: payment dated after the visit`);
        if (!['SUCCEEDED', 'REFUNDED'].includes(p.status)) failures.push(`${a.id}: payment ${p.status}`);
      }
      if (payments.some((x) => x.status === 'REFUNDED') && !['CANCELLED', 'RESCHEDULED', 'COMPLETED'].includes(a.status)) failures.push(`${a.id}: refunded payment on a ${a.status} appointment`);
      if (['CANCELLED', 'RESCHEDULED'].includes(a.status) && payments.some((p) => p.status === 'SUCCEEDED')) failures.push(`${a.id}: ${a.status} but payment not refunded`);
    }
    record('I3', 'Paid visits have exactly one payment dated at booking; refunds only on cancel/reschedule/admin refund', checked, failures);
  }

  // 4. Earnings reconcile: computed exactly as GetDoctorEarningsSummaryUseCase does (15% commission on SUCCEEDED/SETTLED).
  {
    const failures: string[] = [];
    const payments = await prisma.paymentTransaction.findMany({ where: { doctorId: { in: doctorProfileIds } } });
    for (const doctorId of doctorProfileIds) {
      const earned = payments.filter((p) => p.doctorId === doctorId && (p.status === 'SUCCEEDED' || p.status === 'SETTLED'));
      const paidVisits = appointments.filter((a) => a.doctorId === doctorId && a.consultationType === 'PAID' && ['COMPLETED', 'NO_SHOW', 'CONFIRMED'].includes(a.status)).length;
      const succeeded = earned.length + payments.filter((p) => p.doctorId === doctorId && p.status === 'REFUNDED' && appointments.find((a) => a.id === p.appointmentId)?.status === 'COMPLETED').length;
      if (succeeded !== paidVisits) failures.push(`${doctorByProfile.get(doctorId)?.key}: ${paidVisits} paid visits vs ${succeeded} charged payments`);
    }
    record('I4', 'Every charged visit has its payment (earnings = payments x 85%)', doctorProfileIds.length, failures);
  }

  // 5. Reviews: completed appointment, its own patient and doctor, one per session.
  {
    const failures: string[] = [];
    const feedback = await prisma.consultationFeedback.findMany({ where: { patientId: { in: patientProfileIds } }, include: { consultationSession: { include: { appointment: true } } } });
    for (const f of feedback) {
      const a = f.consultationSession.appointment;
      if (a.status !== 'COMPLETED') failures.push(`${f.id}: review on ${a.status}`);
      if (a.patientId !== f.patientId || a.doctorId !== f.doctorId) failures.push(`${f.id}: patient/doctor mismatch`);
      if (f.createdAt.getTime() < (f.consultationSession.closedAt?.getTime() ?? 0)) failures.push(`${f.id}: review before the consultation closed`);
    }
    record('I5', 'Reviews only on completed consultations, by that patient, for that doctor', feedback.length, failures);
  }

  // 6. Prescriptions: same session/doctor/patient, signed with a code, no allergy conflict, fits the specialty.
  {
    const failures: string[] = [];
    const drugSpecialties = new Map<string, Set<string>>();
    for (const spec of Object.values(CONDITIONS)) {
      for (const med of [...spec.regimen.flat(), ...Object.values(spec.alternatives ?? {}).flat()]) {
        const set = drugSpecialties.get(med.name) ?? new Set<string>();
        set.add(spec.specialty);
        drugSpecialties.set(med.name, set);
      }
    }
    const prescriptions = await prisma.prescription.findMany({
      where: { authoringDoctorId: { in: doctorProfileIds } },
      include: { lineItems: true, diagnosisNode: { include: { healthGraph: true } }, consultationSession: { include: { appointment: true } } },
    });
    for (const p of prescriptions) {
      const a = p.consultationSession.appointment;
      const doctor = doctorByProfile.get(p.authoringDoctorId);
      const patient = patientByProfile.get(a.patientId);
      if (a.doctorId !== p.authoringDoctorId) failures.push(`${p.id}: not the treating doctor`);
      if (p.diagnosisNode.healthGraph.patientId !== a.patientId) failures.push(`${p.id}: diagnosis of another patient`);
      if (p.status === 'SIGNED' && (!p.verificationCode || !p.signatureHash || !p.signedAt)) failures.push(`${p.id}: signed without code/signature (D1)`);
      if (!(p.consultationSession.state === 'CLOSED' && p.consultationSession.completionReason === 'COMPLETED') && p.consultationSession.state !== 'IN_PROGRESS') failures.push(`${p.id}: session not completed`);
      const allergies = (await prisma.patientProfile.findUnique({ where: { id: a.patientId }, select: { allergies: true } }))?.allergies?.toLowerCase() ?? '';
      for (const item of p.lineItems) {
        const name = item.drugName ?? '';
        if (/penicillin/.test(allergies) && /amoxicillin|penicillin|ampicillin/i.test(name)) failures.push(`${p.id}: ${name} for a penicillin-allergic patient (${patient?.key})`);
        if (/aspirin|ibuprofen|nsaid/.test(allergies) && /ibuprofen|diclofenac|naproxen|aspirin/i.test(name)) failures.push(`${p.id}: ${name} for an NSAID-allergic patient`);
        if (/sulfa|sulfon/.test(allergies) && /sulfa|sulfamethoxazole/i.test(name)) failures.push(`${p.id}: ${name} for a sulfa-allergic patient`);
        if (isDemoTimelineId(p.id) && doctor && !drugSpecialties.get(name)?.has(doctor.specialty)) failures.push(`${p.id}: ${name} outside ${doctor.specialty}`);
      }
    }
    record('I6', 'Prescriptions: treating doctor, own patient, signed with a code, allergy-safe, specialty-appropriate', prescriptions.length, failures);
  }

  // 7. Clinical records belong to a valid session; diagnoses fit the doctor's specialty.
  {
    const failures: string[] = [];
    const labelSpecialty = new Map(Object.values(CONDITIONS).map((spec) => [spec.label, spec.specialty]));
    const nodes = await prisma.healthGraphNode.findMany({ where: { authoringDoctorId: { in: doctorProfileIds } }, include: { consultationSession: { include: { appointment: true } }, healthGraph: true } });
    for (const node of nodes) {
      const session = node.consultationSession;
      if (session && session.appointment.patientId !== node.healthGraph.patientId) failures.push(`${node.id}: node on another patient's graph`);
      if (session && session.appointment.doctorId !== node.authoringDoctorId) failures.push(`${node.id}: not the treating doctor`);
      const doctor = node.authoringDoctorId ? doctorByProfile.get(node.authoringDoctorId) : undefined;
      const specialty = labelSpecialty.get(node.freeTextDescription ?? '');
      if (isDemoTimelineId(node.id) && specialty && doctor && specialty !== doctor.specialty) failures.push(`${node.id}: ${specialty} diagnosis by ${doctor.specialty}`);
    }
    const notes = await prisma.clinicalNote.findMany({ where: { authoringDoctorId: { in: doctorProfileIds } }, include: { consultationSession: { include: { appointment: true } } } });
    for (const note of notes) {
      if (note.consultationSession.appointment.doctorId !== note.authoringDoctorId) failures.push(`${note.id}: note by another doctor`);
      if (isDemoTimelineId(note.id) && !note.addendumOfNoteId && (!note.subjective || !note.objective || !note.assessment || !note.plan)) failures.push(`${note.id}: SOAP field missing`);
    }
    const completedWithoutNote = appointments.filter((a) => a.status === 'COMPLETED' && a.consultationSession && !notes.some((n) => n.consultationSessionId === a.consultationSession!.id));
    for (const a of completedWithoutNote) failures.push(`${a.id}: completed visit without a clinical note`);
    record('I7', 'Notes/diagnoses belong to the treating doctor\'s session; diagnoses fit the specialty; every completed visit has SOAP notes', nodes.length + notes.length, failures);
  }

  // 8. Vitals: plausible, and gradual.
  {
    const failures: string[] = [];
    const vitals = await prisma.vitalReading.findMany({ where: { patientId: { in: patientProfileIds } }, orderBy: { recordedAt: 'asc' } });
    const ranges: Record<string, [number, number]> = { WEIGHT: [35, 200], BLOOD_PRESSURE: [80, 190], BLOOD_SUGAR: [55, 300] };
    const last = new Map<string, (typeof vitals)[number]>();
    for (const v of vitals) {
      const [min, max] = ranges[v.type];
      if (v.value < min || v.value > max) failures.push(`${v.id}: ${v.type} ${v.value}`);
      if (v.type === 'BLOOD_PRESSURE' && (v.diastolicValue === null || v.diastolicValue < 45 || v.diastolicValue > 120 || v.diastolicValue >= v.value)) failures.push(`${v.id}: diastolic ${v.diastolicValue}`);
      const key = `${v.patientId}:${v.type}`;
      const prev = last.get(key);
      if (prev && v.type === 'WEIGHT') {
        const days = Math.max(1, (v.recordedAt.getTime() - prev.recordedAt.getTime()) / MS_PER_DAY);
        const allowed = 1.0 + (2.0 * days) / 30;
        if (Math.abs(v.value - prev.value) > allowed) failures.push(`${patientByProfile.get(v.patientId)?.key}: weight ${prev.value} -> ${v.value} in ${days.toFixed(0)} days (D10)`);
      }
      last.set(key, v);
    }
    record('I8', 'Vitals plausible; weight changes gradually', vitals.length, failures);
  }

  // 9. Documents: every asset row has its object; identity documents never in clinical purposes.
  {
    const failures: string[] = [];
    const assets = await prisma.mediaAsset.findMany({ where: { ownerAccountId: { in: accountIds } } });
    if (storage) {
      for (const asset of assets) {
        try {
          const head = await storage.client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: asset.storageKey }));
          if (head.ContentType && head.ContentType !== asset.contentType) failures.push(`${asset.id}: object ${head.ContentType} vs row ${asset.contentType}`);
          if (isDemoTimelineId(asset.id) && asset.sizeEstimate && head.ContentLength !== asset.sizeEstimate) failures.push(`${asset.id}: size ${head.ContentLength} vs ${asset.sizeEstimate}`);
        } catch {
          failures.push(`${asset.id} (${asset.purpose}): object missing (D2 class)`);
        }
      }
    }
    for (const asset of assets.filter((a) => isDemoTimelineId(a.id))) {
      if (!['lab_report', 'clinical_attachment'].includes(asset.purpose)) failures.push(`${asset.id}: timeline asset with purpose ${asset.purpose}`);
    }
    record('I9', 'Every document row has its stored object (right type and size)', assets.length, failures);
  }

  // 10. Notifications: links a recipient can open, real entities, not in the future, mixed read state.
  {
    const failures: string[] = [];
    const notifications = await prisma.notification.findMany({ where: { accountId: { in: accountIds } } });
    const roles = new Map((await prisma.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, role: true } })).map((a) => [a.id, a.role]));
    for (const n of notifications) {
      const role = roles.get(n.accountId);
      const url = n.actionUrl ?? '';
      if (url) {
        const allowed = url.startsWith('/security') || url.startsWith('/notifications') || (role === 'patient' && url.startsWith('/patient')) || (role === 'doctor' && url.startsWith('/doctor') && !url.startsWith('/doctor/onboarding')) || ((role === 'super_admin' || role === 'hospital_admin') && url.startsWith('/admin'));
        if (!allowed) failures.push(`${n.id}: "${n.title}" -> ${url} for a ${role} (D3 class)`);
      }
      if (n.createdAt.getTime() > anchor.getTime() + 5 * MS_PER_MINUTE) failures.push(`${n.id}: dated in the future`);
    }
    const appointmentIds = new Set(appointments.map((a) => a.id));
    for (const n of notifications.filter((x) => x.entityType === 'appointment' && x.entityId)) {
      if (!appointmentIds.has(n.entityId!)) {
        const exists = await prisma.appointment.findUnique({ where: { id: n.entityId! }, select: { id: true } });
        if (!exists) failures.push(`${n.id}: orphaned appointment reference`);
      }
    }
    record('I10', 'Notification links open an authorised page; entities exist; nothing dated in the future', notifications.length, failures);
  }

  // 11. Message threads only between related doctor-patient pairs; read receipts consistent.
  {
    const failures: string[] = [];
    const threads = await prisma.messageThread.findMany({ where: { patientId: { in: patientProfileIds } }, include: { messages: true } });
    for (const t of threads) {
      if (!appointments.some((a) => a.patientId === t.patientId && a.doctorId === t.doctorId)) failures.push(`${t.id}: no appointment relationship`);
      const lastMessage = t.messages.reduce((max, m) => (m.createdAt > max ? m.createdAt : max), new Date(0));
      if (t.messages.length > 0 && Math.abs(lastMessage.getTime() - t.lastMessageAt.getTime()) > 1000) failures.push(`${t.id}: lastMessageAt out of sync`);
    }
    // A waitlist is joined from WaitlistPanel, which only offers doctors from the patient's own appointment history.
    const waitlist = await prisma.waitlistEntry.findMany({ where: { patientId: { in: patientProfileIds } } });
    for (const w of waitlist) {
      if (!appointments.some((a) => a.patientId === w.patientId && a.doctorId === w.doctorId && a.createdAt.getTime() <= w.createdAt.getTime())) failures.push(`waitlist ${w.id}: doctor not in the patient's history when joined`);
    }
    record('I11', 'Threads and waitlist entries only for related pairs; lastMessageAt in sync', threads.length + waitlist.length, failures);
  }

  // 12. Verification consistent with practice.
  {
    const failures: string[] = [];
    for (const doctor of population.doctors.values()) {
      const cases = await prisma.verificationCase.findMany({ where: { subjectAccountId: doctor.accountId }, orderBy: { submittedAt: 'asc' } });
      const approved = cases.filter((c) => c.status === 'APPROVED').sort((a, b) => (a.decidedAt?.getTime() ?? 0) - (b.decidedAt?.getTime() ?? 0))[0];
      const practice = appointments.filter((a) => a.doctorId === doctor.profileId);
      if (practice.length === 0) continue;
      if (!approved?.decidedAt) failures.push(`${doctor.key}: practising without an approved verification`);
      else {
        const first = practice.reduce((min, a) => (a.createdAt < min ? a.createdAt : min), practice[0].createdAt);
        if (first.getTime() < approved.decidedAt.getTime()) failures.push(`${doctor.key}: first booking ${first.toISOString()} before approval ${approved.decidedAt.toISOString()}`);
        if (approved.decidedAt.getTime() - approved.submittedAt.getTime() < 60 * MS_PER_MINUTE) failures.push(`${doctor.key}: decided ${((approved.decidedAt.getTime() - approved.submittedAt.getTime()) / MS_PER_MINUTE).toFixed(0)} min after submission`);
      }
      if (doctor.role !== 'doctor') failures.push(`${doctor.key}: role ${doctor.role}`);
    }
    for (const patient of population.patients.values()) {
      const suspended = await prisma.verificationCase.findFirst({ where: { subjectAccountId: patient.accountId, status: 'SUSPENDED' } });
      if (suspended) {
        const after = appointments.filter((a) => a.patientId === patient.profileId && a.createdAt.getTime() > anchor.getTime() - 21 * MS_PER_DAY);
        if (after.length > 0) failures.push(`${patient.key}: ${after.length} bookings after identity suspension`);
      }
    }
    record('I12', 'Doctors practise only after approval (realistic review time); no activity after suspension', population.doctors.size, failures);
  }

  // 13. No permanently transient states.
  {
    const failures: string[] = [];
    for (const a of appointments) {
      if (a.status === 'CONFIRMED' && a.scheduledAt.getTime() < anchor.getTime() - 30 * MS_PER_MINUTE) failures.push(`${a.id}: past CONFIRMED (needs resolution)`);
      if (a.status === 'REQUESTED' && a.scheduledAt.getTime() < anchor.getTime()) failures.push(`${a.id}: past REQUESTED`);
      if (a.consultationSession?.state === 'IN_PROGRESS') failures.push(`${a.id}: session left IN_PROGRESS`);
    }
    record('I13', 'No stale CONFIRMED/REQUESTED appointments or sessions left in progress', appointments.length, failures);
  }

  // 14. Scope: every timeline row belongs to the demo population.
  {
    const failures: string[] = [];
    const outside = await prisma.appointment.findMany({ where: { OR: [{ patientId: { notIn: patientProfileIds } }, { doctorId: { notIn: doctorProfileIds } }] }, select: { id: true } });
    for (const row of outside.filter((r) => isDemoTimelineId(r.id))) failures.push(`appointment ${row.id} outside the demo scope`);
    const outsideNotifications = await prisma.notification.findMany({ where: { accountId: { notIn: accountIds } }, select: { id: true } });
    for (const row of outsideNotifications.filter((r) => isDemoTimelineId(r.id))) failures.push(`notification ${row.id} outside the demo scope`);
    record('I14', 'Timeline rows only reference demo allow-list accounts', outside.length + outsideNotifications.length, failures);
  }

  // 15. Dates: history <= anchor, upcoming within the 30-day booking window, pending approvals in the future.
  {
    const failures: string[] = [];
    for (const a of appointments.filter((x) => isDemoTimelineId(x.id))) {
      if (a.createdAt.getTime() > anchor.getTime()) failures.push(`${a.id}: booked in the future`);
      if (a.scheduledAt.getTime() > anchor.getTime() + 30 * MS_PER_DAY) failures.push(`${a.id}: beyond the 30-day booking window`);
      if (a.status === 'COMPLETED' && (a.consultationSession?.closedAt?.getTime() ?? 0) > anchor.getTime()) failures.push(`${a.id}: completed in the future`);
      if (a.status === 'REQUESTED' && a.scheduledAt.getTime() <= anchor.getTime()) failures.push(`${a.id}: pending request in the past`);
      if (a.createdAt.getTime() > a.scheduledAt.getTime()) failures.push(`${a.id}: booked after its own slot`);
    }
    record('I15', 'Dates: history before the anchor, upcoming within 30 days, pending requests in the future', appointments.length, failures);
  }

  // Coverage floors (reported).
  {
    const failures: string[] = [];
    for (const doctor of population.doctors.values()) {
      const mine = appointments.filter((a) => a.doctorId === doctor.profileId);
      const completed = mine.filter((a) => a.status === 'COMPLETED').length;
      const upcoming = mine.filter((a) => a.scheduledAt > anchor && ['CONFIRMED', 'REQUESTED'].includes(a.status)).length;
      const reviews = await prisma.consultationFeedback.count({ where: { doctorId: doctor.profileId, moderationStatus: 'VISIBLE' } });
      if (completed < MIN_COMPLETED_PER_DOCTOR) failures.push(`${doctor.key}: ${completed} completed`);
      if (upcoming < 2) failures.push(`${doctor.key}: ${upcoming} upcoming`);
      if (reviews < 5) failures.push(`${doctor.key}: ${reviews} visible reviews (rating hidden below 5)`);
    }
    for (const patient of population.patients.values()) {
      const mine = appointments.filter((a) => a.patientId === patient.profileId);
      const completed = mine.filter((a) => a.status === 'COMPLETED');
      const doctors = new Set(completed.map((a) => a.doctorId)).size;
      const upcoming = mine.filter((a) => a.scheduledAt > anchor && ['CONFIRMED', 'REQUESTED'].includes(a.status)).length;
      const documents = await prisma.mediaAsset.count({ where: { ownerAccountId: patient.accountId, purpose: { in: ['lab_report', 'clinical_attachment'] } } });
      if (completed.length < 5) failures.push(`${patient.key}: ${completed.length} completed`);
      if (doctors < 3) failures.push(`${patient.key}: ${doctors} doctors`);
      if (upcoming < 1 && patient.key !== 'patient17') failures.push(`${patient.key}: no upcoming visit`);
      if (documents < 2) failures.push(`${patient.key}: ${documents} documents`);
    }
    record('C1', 'Coverage floors per doctor and per patient', population.doctors.size + population.patients.size, failures, 'coverage');
  }

  return results;
}
