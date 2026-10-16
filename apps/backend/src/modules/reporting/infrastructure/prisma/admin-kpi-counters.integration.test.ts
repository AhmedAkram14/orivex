import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import type { PrismaService } from '../../../../platform/database/prisma.service.js';

import { PrismaAppointmentAnalyticsQueryService } from './prisma-appointment-analytics-query.service.js';
import { PrismaDoctorAnalyticsQueryService } from './prisma-doctor-analytics-query.service.js';
import { PrismaTelemedicineAnalyticsQueryService } from './prisma-telemedicine-analytics-query.service.js';
import { PrismaVerificationAnalyticsQueryService } from './prisma-verification-analytics-query.service.js';

// Admin KPI counters regression (D6), real PostgreSQL only. Both counters
// were wrong in the same way -- each read a value the domain never produces
// for the thing being counted:
//   - "Verified doctors" counted every APPROVED verification case, so approved
//     patient identity checks inflated it (37 of 20 doctors on the hosted demo).
//   - "Completed sessions" counted state = COMPLETED, which
//     ConsultationSession.close() never sets (a finished visit ends CLOSED with
//     completionReason COMPLETED), so it was always 0.
//   - "Upcoming appointments" (platform and per doctor) counted RESCHEDULED,
//     which is a reschedule's superseded original, so one rescheduled visit
//     counted twice.
// The verification rows are isolated by a submittedAt window in 2001 that no
// real or demo case uses; the session rows by this test's own doctor id.
describe('Admin KPI counters (real PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const verification = new PrismaVerificationAnalyticsQueryService(prisma as unknown as PrismaService);
  const telemedicine = new PrismaTelemedicineAnalyticsQueryService(prisma as unknown as PrismaService);
  const appointments = new PrismaAppointmentAnalyticsQueryService(prisma as unknown as PrismaService);
  const doctors = new PrismaDoctorAnalyticsQueryService(prisma as unknown as PrismaService);
  const accountIds: string[] = [];
  let doctorProfileId: string;
  let patientProfileId: string;
  const window = { dateFrom: new Date('2001-03-01T00:00:00Z'), dateTo: new Date('2001-03-31T23:59:59Z') };

  async function account(role: 'doctor' | 'patient', label: string): Promise<string> {
    const id = randomUUID();
    await prisma.account.create({ data: { id, email: `kpi-${label}-${id}@test.orivex.dev`, role, displayName: `KPI ${label}` } });
    accountIds.push(id);
    return id;
  }

  before(async () => {
    await prisma.$connect();
    const specialty = await prisma.medicalSpecialty.findFirst();
    if (!specialty) {
      throw new Error('No MedicalSpecialty reference row seeded -- required for this integration test to create a DoctorProfile.');
    }

    const at = (day: number, hour = 9): Date => new Date(Date.UTC(2001, 2, day, hour));
    // Doctor A: rejected first, approved on resubmission -> one verified doctor.
    const doctorA = await account('doctor', 'doctor-a');
    await prisma.verificationCase.create({ data: { subjectAccountId: doctorA, subjectType: 'DOCTOR', status: 'REJECTED', submittedAt: at(2), decidedAt: at(3) } });
    await prisma.verificationCase.create({ data: { subjectAccountId: doctorA, subjectType: 'DOCTOR', status: 'APPROVED', submittedAt: at(10), decidedAt: at(11) } });
    // Doctor B: approved.
    const doctorB = await account('doctor', 'doctor-b');
    await prisma.verificationCase.create({ data: { subjectAccountId: doctorB, subjectType: 'DOCTOR', status: 'APPROVED', submittedAt: at(12), decidedAt: at(13) } });
    // Doctor C: still pending.
    const doctorC = await account('doctor', 'doctor-c');
    await prisma.verificationCase.create({ data: { subjectAccountId: doctorC, subjectType: 'DOCTOR', status: 'SUBMITTED', submittedAt: at(14) } });
    // Two patients with approved identity checks.
    for (const label of ['patient-a', 'patient-b']) {
      const patient = await account('patient', label);
      await prisma.verificationCase.create({ data: { subjectAccountId: patient, subjectType: 'PATIENT', status: 'APPROVED', submittedAt: at(15), decidedAt: at(15, 13) } });
    }

    // Sessions for the telemedicine counter, all on this test's own doctor.
    doctorProfileId = (
      await prisma.doctorProfile.create({
        data: { accountId: doctorA, licenseNumber: `LIC-KPI-${doctorA.slice(0, 8)}`, specialtyId: specialty.id, languages: [], insuranceProviders: [] },
      })
    ).id;
    const patientAccount = await account('patient', 'session-patient');
    patientProfileId = (await prisma.patientProfile.create({ data: { accountId: patientAccount } })).id;
    const sessions: { state: 'CLOSED' | 'WAITING_ROOM'; completionReason: 'COMPLETED' | 'INTERRUPTED_TECHNICAL' | null }[] = [
      { state: 'CLOSED', completionReason: 'COMPLETED' },
      { state: 'CLOSED', completionReason: 'COMPLETED' },
      { state: 'CLOSED', completionReason: 'INTERRUPTED_TECHNICAL' },
      { state: 'WAITING_ROOM', completionReason: null },
    ];
    for (const [index, session] of sessions.entries()) {
      const scheduledAt = new Date(Date.UTC(2001, 2, 20 + index, 10));
      const windowRow = await prisma.availabilityWindow.create({
        data: { doctorId: doctorProfileId, startTime: scheduledAt, endTime: new Date(scheduledAt.getTime() + 30 * 60_000), consultationType: 'FREE', status: 'BOOKED' },
      });
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patientProfileId,
          doctorId: doctorProfileId,
          availabilityWindowId: windowRow.id,
          consultationType: 'FREE',
          status: session.completionReason === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED',
          scheduledAt,
        },
      });
      await prisma.consultationSession.create({
        data: {
          appointmentId: appointment.id,
          state: session.state,
          completionReason: session.completionReason,
          startedAt: session.state === 'CLOSED' ? scheduledAt : null,
          closedAt: session.state === 'CLOSED' ? new Date(scheduledAt.getTime() + 25 * 60_000) : null,
          createdAt: scheduledAt,
        },
      });
    }

    // A reschedule, as the domain leaves it: the original appointment is
    // RESCHEDULED (superseded, kept for history) and the new time is its own
    // CONFIRMED appointment pointing back at it. One visit, not two.
    const inDays = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60_000);
    const original = await appointment(inDays(3), 'RESCHEDULED');
    await appointment(inDays(5), 'CONFIRMED', original);
  });

  async function appointment(scheduledAt: Date, status: 'CONFIRMED' | 'RESCHEDULED', rescheduledFromId?: string): Promise<string> {
    const windowRow = await prisma.availabilityWindow.create({
      data: { doctorId: doctorProfileId, startTime: scheduledAt, endTime: new Date(scheduledAt.getTime() + 30 * 60_000), consultationType: 'FREE', status: 'BOOKED' },
    });
    const row = await prisma.appointment.create({
      data: { patientId: patientProfileId, doctorId: doctorProfileId, availabilityWindowId: windowRow.id, consultationType: 'FREE', status, scheduledAt, rescheduledFromId },
    });
    return row.id;
  }

  after(async () => {
    await prisma.consultationSession.deleteMany({ where: { appointment: { doctorId: doctorProfileId } } });
    await prisma.appointment.deleteMany({ where: { doctorId: doctorProfileId, rescheduledFromId: { not: null } } });
    await prisma.appointment.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.availabilityWindow.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } });
    await prisma.doctorProfile.deleteMany({ where: { id: doctorProfileId } });
    await prisma.verificationCase.deleteMany({ where: { subjectAccountId: { in: accountIds } } });
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.$disconnect();
  });

  it('counts verified doctors as distinct doctors with an approved professional verification -- never patients, never twice', async () => {
    const result = await verification.getAnalytics(window);
    assert.equal(result.approved, 4, 'every approved case, any subject (the verification section\'s own figure)');
    assert.equal(result.approvedDoctors, 2, 'doctor A (rejected, then approved) and doctor B; not the 2 approved patients');
    assert.equal(result.pending, 1);
  });

  it('counts completed telemedicine sessions as CLOSED + completionReason COMPLETED', async () => {
    const result = await telemedicine.getAnalytics({ doctorId: doctorProfileId });
    assert.equal(result.totalSessions, 4);
    assert.equal(result.completedSessions, 2, 'not the interrupted one, not the one still waiting');
  });

  it('counts a rescheduled visit once in "upcoming appointments" -- the replacement, never the superseded original', async () => {
    const result = await appointments.getAnalytics({ doctorId: doctorProfileId }, 'month');
    assert.equal(result.upcomingCount, 1);
  });

  it('counts a rescheduled visit once in a doctor\'s upcoming appointments (admin doctor activity)', async () => {
    const [row] = await doctors.getActivity({ doctorId: doctorProfileId, dateFrom: new Date() });
    assert.equal(row?.upcomingAppointments, 1);
  });
});
