import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import type { PrismaService } from '../../../../platform/database/prisma.service.js';
import { GetAdminOverviewUseCase } from '../../application/use-cases/get-admin-overview/get-admin-overview.use-case.js';
import { GetDashboardKpisUseCase } from '../../application/use-cases/get-dashboard-kpis/get-dashboard-kpis.use-case.js';

import { PrismaAdminQueueQueryService } from './prisma-admin-queue-query.service.js';
import { PrismaAppointmentAnalyticsQueryService } from './prisma-appointment-analytics-query.service.js';
import { PrismaDoctorAnalyticsQueryService } from './prisma-doctor-analytics-query.service.js';
import { PrismaPatientAnalyticsQueryService } from './prisma-patient-analytics-query.service.js';
import { PrismaPaymentAnalyticsQueryService } from './prisma-payment-analytics-query.service.js';
import { PrismaTelemedicineAnalyticsQueryService } from './prisma-telemedicine-analytics-query.service.js';
import { PrismaVerificationAnalyticsQueryService } from './prisma-verification-analytics-query.service.js';

type AppointmentStatus = 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'CONFIRMED';

// Admin Overview, real PostgreSQL only. "Active" used to mean "any
// appointment in the window, any status", so a patient whose only booking
// was cancelled counted as active. It now means a COMPLETED appointment, for
// doctors and patients alike, and the Overview must show exactly what
// Analytics shows for the same data. The definition checks are isolated by
// a scheduledAt window in 2002 that no real or demo row uses; the equality
// checks run over the live trailing 30 days, whatever else is in the
// database, because equality must hold for any data.
describe('Admin Overview (real PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const service = prisma as unknown as PrismaService;
  const patients = new PrismaPatientAnalyticsQueryService(service);
  const doctors = new PrismaDoctorAnalyticsQueryService(service);
  const queues = new PrismaAdminQueueQueryService(service);
  const verification = new PrismaVerificationAnalyticsQueryService(service);
  const appointmentsQuery = new PrismaAppointmentAnalyticsQueryService(service);
  const payments = new PrismaPaymentAnalyticsQueryService(service);
  const overview = new GetAdminOverviewUseCase(queues, verification, appointmentsQuery, payments, patients, doctors);
  const dashboard = new GetDashboardKpisUseCase(
    { execute: async () => ({ total: 0, accounts: [], page: 1, limit: 1 }) } as never,
    verification,
    appointmentsQuery,
    new PrismaTelemedicineAnalyticsQueryService(service),
    payments,
    patients,
    { execute: async () => ({ entries: [], total: 0 }) } as never,
    doctors,
  );

  const window2002 = { from: new Date('2002-05-01T00:00:00Z'), to: new Date('2002-05-31T23:59:59Z') };
  const accountIds: string[] = [];
  const doctorProfileIds: string[] = [];
  const patientProfileIds: string[] = [];
  let specialtyId: string;

  async function account(role: 'doctor' | 'patient', label: string): Promise<string> {
    const id = randomUUID();
    await prisma.account.create({ data: { id, email: `overview-${label}-${id}@test.orivex.dev`, role, displayName: `Overview ${label}` } });
    accountIds.push(id);
    return id;
  }

  async function doctor(label: string): Promise<string> {
    const accountId = await account('doctor', label);
    const profile = await prisma.doctorProfile.create({
      data: { accountId, licenseNumber: `LIC-OVW-${accountId.slice(0, 8)}`, specialtyId, languages: [], insuranceProviders: [] },
    });
    doctorProfileIds.push(profile.id);
    return profile.id;
  }

  async function patient(label: string): Promise<string> {
    const accountId = await account('patient', label);
    const profile = await prisma.patientProfile.create({ data: { accountId } });
    patientProfileIds.push(profile.id);
    return profile.id;
  }

  async function appointment(doctorId: string, patientId: string, status: AppointmentStatus, scheduledAt: Date): Promise<string> {
    const slot = await prisma.availabilityWindow.create({
      data: { doctorId, startTime: scheduledAt, endTime: new Date(scheduledAt.getTime() + 30 * 60_000), consultationType: 'FREE', status: 'BOOKED' },
    });
    const row = await prisma.appointment.create({
      data: { patientId, doctorId, availabilityWindowId: slot.id, consultationType: 'FREE', status, scheduledAt },
    });
    return row.id;
  }

  before(async () => {
    await prisma.$connect();
    const specialty = await prisma.medicalSpecialty.findFirst();
    if (!specialty) {
      throw new Error('No MedicalSpecialty reference row seeded -- required for this integration test to create a DoctorProfile.');
    }
    specialtyId = specialty.id;

    const at = (day: number): Date => new Date(Date.UTC(2002, 4, day, 10));
    const seenDoctor = await doctor('seen-doctor');
    const idleDoctor = await doctor('idle-doctor');
    const seenPatient = await patient('seen-patient');
    const cancelledPatient = await patient('cancelled-patient');
    const missedPatient = await patient('missed-patient');
    // One real visit; the seen patient's second, cancelled booking changes nothing.
    await appointment(seenDoctor, seenPatient, 'COMPLETED', at(3));
    await appointment(seenDoctor, seenPatient, 'CANCELLED', at(4));
    // Bookings that never became a visit: none of these is activity.
    await appointment(idleDoctor, cancelledPatient, 'CANCELLED', at(5));
    await appointment(idleDoctor, missedPatient, 'NO_SHOW', at(6));
    await appointment(idleDoctor, missedPatient, 'CONFIRMED', at(7));

    // Live-window rows, so the equality checks below cover a non-empty set.
    const recentPatient = await patient('recent-patient');
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000);
    await appointment(seenDoctor, recentPatient, 'COMPLETED', twoDaysAgo);
    await appointment(idleDoctor, cancelledPatient, 'CANCELLED', new Date(twoDaysAgo.getTime() + 60 * 60_000));
  });

  after(async () => {
    await prisma.verificationCase.deleteMany({ where: { subjectAccountId: { in: accountIds } } });
    await prisma.appointment.deleteMany({ where: { doctorId: { in: doctorProfileIds } } });
    await prisma.availabilityWindow.deleteMany({ where: { doctorId: { in: doctorProfileIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: patientProfileIds } } });
    await prisma.doctorProfile.deleteMany({ where: { id: { in: doctorProfileIds } } });
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.$disconnect();
  });

  it('counts a patient as active only with a COMPLETED appointment -- never a cancelled, missed or upcoming booking', async () => {
    assert.equal(await patients.countActivePatients(window2002), 1);
    const section = await patients.getAnalytics({ dateFrom: window2002.from, dateTo: window2002.to });
    assert.equal(section.activePatients, 1, 'the Analytics patient section reports the same definition');
  });

  it('counts a doctor as active by the same rule', async () => {
    assert.equal(await doctors.countActiveDoctors(window2002), 1, 'the doctor with a completed visit, not the one whose bookings never happened');
  });

  it('shows the same active patients and active doctors on the Overview as on Analytics (no filter), for the same data', async () => {
    const [fromOverview, fromDashboard, fromPatientSection] = await Promise.all([
      overview.execute(),
      dashboard.execute({}),
      patients.getAnalytics({}),
    ]);

    assert.ok(fromOverview.health.activePatients >= 1, 'the recent completed visit is counted');
    assert.equal(fromOverview.health.activePatients, fromDashboard.activePatients);
    assert.equal(fromOverview.health.activePatients, fromPatientSection.activePatients);
    assert.equal(fromOverview.health.activeDoctors, fromDashboard.activeDoctors);
  });

  it('shows the same appointment rates and failed payments as Analytics with no filter', async () => {
    const [fromOverview, rates, paymentSection] = await Promise.all([
      overview.execute(),
      appointmentsQuery.getAnalytics({}, 'day'),
      payments.getAnalytics({}, { from: new Date(Date.now() - 30 * 24 * 60 * 60_000), to: new Date() }),
    ]);

    assert.equal(fromOverview.health.completionRate, rates.completionRate);
    assert.equal(fromOverview.health.cancellationRate, rates.cancellationRate);
    assert.equal(fromOverview.health.noShowRate, rates.noShowRate);
    assert.equal(fromOverview.health.failedPayments, paymentSection.failedPayments);
  });

  it('reports the verification queue as the review queue lists it, with its oldest submission', async () => {
    const applicant = await account('doctor', 'pending-applicant');
    const submittedAt = new Date('2002-05-02T08:00:00Z');
    await prisma.verificationCase.create({ data: { subjectAccountId: applicant, subjectType: 'DOCTOR', status: 'SUBMITTED', submittedAt } });
    const listed = await prisma.verificationCase.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_NEEDED'] } } });

    const snapshot = await queues.getPendingVerifications();
    assert.equal(snapshot.count, listed);
    assert.ok(snapshot.oldestWaitingSince && snapshot.oldestWaitingSince.getTime() <= submittedAt.getTime());
  });
});
