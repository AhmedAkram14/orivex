import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import { ConsultationPricing } from '../../domain/value-objects/consultation-pricing.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import type { PrismaService } from '../../../../platform/database/prisma.service.js';

import { PrismaAppointmentRepository } from './prisma-appointment.repository.js';

// Phase 0 (Doctor Reports page rebuild): real PostgreSQL only (no mocks),
// same precedent as prisma-free-tier-booking.repository.integration.test.ts
// -- requires a running local database reachable via DATABASE_URL. Proves
// the three new dated/bucketed repository methods against real rows rather
// than a mocked Prisma client, since their entire value is the exact SQL
// shape (groupBy + date range predicate, raw date_trunc SQL).
describe('PrismaAppointmentRepository -- Phase 0 dated/bucketed methods (real PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const repo = new PrismaAppointmentRepository(prisma as unknown as PrismaService);
  const cleanupAccountIds: string[] = [];
  const cleanupPatientProfileIds: string[] = [];
  let doctorProfileId: string;
  let patientProfileId: string;
  let specialtyId: string;

  before(async () => {
    await prisma.$connect();

    const specialty = await prisma.medicalSpecialty.findFirst();
    if (!specialty) {
      throw new Error('No MedicalSpecialty reference row seeded -- required for this integration test to create a DoctorProfile.');
    }
    specialtyId = specialty.id;

    const doctorAccountId = randomUUID();
    await prisma.account.create({
      data: {
        id: doctorAccountId,
        email: `phase0-reports-doctor-${doctorAccountId}@test.orivex.dev`,
        role: 'doctor',
        displayName: 'Dr. Phase 0 Reports Test',
      },
    });
    cleanupAccountIds.push(doctorAccountId);

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        accountId: doctorAccountId,
        licenseNumber: `LIC-P0-${doctorAccountId.slice(0, 8)}`,
        specialtyId,
        languages: [],
        insuranceProviders: [],
      },
    });
    doctorProfileId = doctorProfile.id;

    const patientAccountId = randomUUID();
    await prisma.account.create({
      data: {
        id: patientAccountId,
        email: `phase0-reports-patient-${patientAccountId}@test.orivex.dev`,
        role: 'patient',
        displayName: 'Phase 0 Reports Test Patient',
      },
    });
    cleanupAccountIds.push(patientAccountId);
    const patientProfile = await prisma.patientProfile.create({ data: { accountId: patientAccountId } });
    patientProfileId = patientProfile.id;
    cleanupPatientProfileIds.push(patientProfileId);
  });

  after(async () => {
    await prisma.appointment.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.availabilityWindow.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: cleanupPatientProfileIds } } });
    await prisma.doctorProfile.deleteMany({ where: { id: doctorProfileId } });
    await prisma.account.deleteMany({ where: { id: { in: cleanupAccountIds } } });
    await prisma.$disconnect();
  });

  async function createWindow(startTime: Date, isFree: boolean) {
    return prisma.availabilityWindow.create({
      data: {
        doctorId: doctorProfileId,
        startTime,
        endTime: new Date(startTime.getTime() + 30 * 60_000),
        consultationType: isFree ? 'FREE' : 'PAID',
        status: 'BOOKED',
      },
    });
  }

  // Persists an appointment with an arbitrary status/scheduledAt directly
  // (Appointment.reconstitute + repo.save's own insert path), mirroring the
  // free-tier integration test's reliance on the real repository under
  // test rather than raw prisma.appointment.create -- but here we need
  // full control over status and date, which only reconstitute() offers.
  async function seedAppointment(opts: { status: AppointmentStatus; scheduledAt: Date; free: boolean }): Promise<void> {
    const window = await createWindow(opts.scheduledAt, opts.free);
    const pricing = opts.free ? ConsultationPricing.free() : ConsultationPricing.paid(Money.create(100, 'EGP'));
    const appointment = Appointment.reconstitute({
      id: randomUUID(),
      patientId: patientProfileId,
      doctorId: doctorProfileId,
      availabilityWindowId: window.id,
      pricing,
      status: opts.status,
      scheduledAt: opts.scheduledAt,
      version: 1,
      createdAt: opts.scheduledAt,
      updatedAt: opts.scheduledAt,
    });
    await repo.save(appointment);
  }

  it('countByStatusForDoctorInRange counts only appointments scheduled within [from, to), bucketed by status', async () => {
    const inRangeConfirmed1 = new Date('2030-01-05T10:00:00Z');
    const inRangeConfirmed2 = new Date('2030-01-10T10:00:00Z');
    const inRangeCancelled = new Date('2030-01-15T10:00:00Z');
    const beforeRange = new Date('2029-12-31T23:00:00Z');
    const afterRange = new Date('2030-02-01T00:00:00Z');

    await seedAppointment({ status: AppointmentStatus.Confirmed, scheduledAt: inRangeConfirmed1, free: false });
    await seedAppointment({ status: AppointmentStatus.Confirmed, scheduledAt: inRangeConfirmed2, free: false });
    await seedAppointment({ status: AppointmentStatus.Cancelled, scheduledAt: inRangeCancelled, free: false });
    await seedAppointment({ status: AppointmentStatus.Confirmed, scheduledAt: beforeRange, free: false });
    await seedAppointment({ status: AppointmentStatus.Confirmed, scheduledAt: afterRange, free: false });

    const from = new Date('2030-01-01T00:00:00Z');
    const to = new Date('2030-02-01T00:00:00Z');
    const result = await repo.countByStatusForDoctorInRange(doctorProfileId, from, to);

    assert.equal(result[AppointmentStatus.Confirmed], 2);
    assert.equal(result[AppointmentStatus.Cancelled], 1);
    assert.equal(result[AppointmentStatus.NoShow] ?? 0, 0);
  });

  it('countFreeRequestedForDoctorInRange counts only Requested + free consultations in range -- matches the pending-approval endpoint definition exactly', async () => {
    const from = new Date('2030-03-01T00:00:00Z');
    const to = new Date('2030-04-01T00:00:00Z');

    await seedAppointment({ status: AppointmentStatus.Requested, scheduledAt: new Date('2030-03-05T10:00:00Z'), free: true });
    await seedAppointment({ status: AppointmentStatus.Requested, scheduledAt: new Date('2030-03-06T10:00:00Z'), free: true });
    // Requested but paid -- must NOT count (mirrors getPendingApproval's isFree() filter).
    await seedAppointment({ status: AppointmentStatus.Requested, scheduledAt: new Date('2030-03-07T10:00:00Z'), free: false });
    // Free but Confirmed, not Requested -- must NOT count.
    await seedAppointment({ status: AppointmentStatus.Confirmed, scheduledAt: new Date('2030-03-08T10:00:00Z'), free: true });
    // Free + Requested, but outside the range -- must NOT count.
    await seedAppointment({ status: AppointmentStatus.Requested, scheduledAt: new Date('2030-05-01T10:00:00Z'), free: true });

    const count = await repo.countFreeRequestedForDoctorInRange(doctorProfileId, from, to);
    assert.equal(count, 2);
  });

  it('countByDoctorIdBucketed groups counts by day, scoped to this doctor and the given range', async () => {
    const from = new Date('2030-06-01T00:00:00Z');
    const to = new Date('2030-06-08T00:00:00Z');

    await seedAppointment({ status: AppointmentStatus.Confirmed, scheduledAt: new Date('2030-06-02T08:00:00Z'), free: false });
    await seedAppointment({ status: AppointmentStatus.Completed, scheduledAt: new Date('2030-06-02T14:00:00Z'), free: false });
    await seedAppointment({ status: AppointmentStatus.Confirmed, scheduledAt: new Date('2030-06-04T09:00:00Z'), free: false });
    // Outside range -- must not appear in any bucket.
    await seedAppointment({ status: AppointmentStatus.Confirmed, scheduledAt: new Date('2030-06-20T09:00:00Z'), free: false });

    const buckets = await repo.countByDoctorIdBucketed(doctorProfileId, from, to, 'day');

    const juneSecond = buckets.find((b) => b.bucket.startsWith('2030-06-02'));
    const juneFourth = buckets.find((b) => b.bucket.startsWith('2030-06-04'));
    assert.ok(juneSecond, 'expected a bucket for 2030-06-02');
    assert.equal(juneSecond?.count, 2);
    assert.ok(juneFourth, 'expected a bucket for 2030-06-04');
    assert.equal(juneFourth?.count, 1);
    assert.ok(!buckets.some((b) => b.bucket.startsWith('2030-06-20')), 'out-of-range appointment must not appear in any bucket');
  });
});
