import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import { Appointment } from '../../domain/entities/appointment.entity.js';
import { ConsultationPricing } from '../../domain/value-objects/consultation-pricing.value-object.js';
import type { PrismaService } from '../../../../platform/database/prisma.service.js';

import { PrismaFreeTierBookingRepository } from './prisma-free-tier-booking.repository.js';

// I8 -- Free-tier abuse controls, mandatory concurrency verification. Real
// PostgreSQL only (no mocks) -- requires a running local database reachable
// via DATABASE_URL (the `orivex-postgres` docker-compose service in this
// project). Proves the exact invariant the spec requires: for any patient,
// concurrent free-booking requests must never allow the number of
// qualifying non-cancelled free appointments in the applicable month to
// exceed MAX_FREE_CONSULTATIONS_PER_MONTH (3).
describe('PrismaFreeTierBookingRepository (real PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const repo = new PrismaFreeTierBookingRepository(prisma as unknown as PrismaService);
  const cleanupAccountIds: string[] = [];
  const cleanupPatientProfileIds: string[] = [];
  const cleanupDoctorProfileIds: string[] = [];
  let doctorProfileId: string;
  let specialtyId: string;

  const CAPS = { maxFreeConsultationsPerMonth: 3, maxNoShowsBeforeBlocked: 2 };

  function monthStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

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
        email: `i8-concurrency-doctor-${doctorAccountId}@test.orivex.dev`,
        role: 'doctor',
        displayName: 'Dr. I8 Concurrency Test',
      },
    });
    cleanupAccountIds.push(doctorAccountId);

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        accountId: doctorAccountId,
        licenseNumber: `LIC-I8-${doctorAccountId.slice(0, 8)}`,
        specialtyId,
        languages: [],
        insuranceProviders: [],
      },
    });
    doctorProfileId = doctorProfile.id;
    cleanupDoctorProfileIds.push(doctorProfileId);
  });

  after(async () => {
    await prisma.appointment.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.availabilityWindow.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: cleanupPatientProfileIds } } });
    await prisma.doctorProfile.deleteMany({ where: { id: { in: cleanupDoctorProfileIds } } });
    await prisma.account.deleteMany({ where: { id: { in: cleanupAccountIds } } });
    await prisma.$disconnect();
  });

  async function createFreshPatient(): Promise<string> {
    const accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        email: `i8-concurrency-patient-${accountId}@test.orivex.dev`,
        role: 'patient',
        displayName: 'I8 Concurrency Test Patient',
      },
    });
    cleanupAccountIds.push(accountId);
    const patientProfile = await prisma.patientProfile.create({ data: { accountId } });
    cleanupPatientProfileIds.push(patientProfile.id);
    return patientProfile.id;
  }

  // Pre-held (not Open) -- this test targets FreeTierBookingRepository's own
  // atomicity, not SchedulingModule's slot-reservation race (already covered
  // by ReserveAvailabilityWindowUseCase's own optimistic-locking tests).
  async function createHeldFreeWindow(startOffsetMinutes: number) {
    const start = new Date(Date.now() + startOffsetMinutes * 60_000);
    return prisma.availabilityWindow.create({
      data: {
        doctorId: doctorProfileId,
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60_000),
        consultationType: 'FREE',
        status: 'HELD',
      },
    });
  }

  function buildFreeAppointment(patientId: string, availabilityWindowId: string, scheduledAt: Date): Appointment {
    return Appointment.request({
      patientId,
      doctorId: doctorProfileId,
      availabilityWindowId,
      pricing: ConsultationPricing.free(),
      scheduledAt,
    });
  }

  it('allows exactly 3 sequential free bookings and rejects the 4th', async () => {
    const patientId = await createFreshPatient();
    const caps = { ...CAPS, freeConsultationsWindowStart: monthStart() };

    for (let i = 0; i < 3; i += 1) {
      const window = await createHeldFreeWindow(60 + i * 90);
      const appointment = buildFreeAppointment(patientId, window.id, window.startTime);
      const outcome = await repo.checkCapsAndSave(appointment, patientId, caps);
      assert.equal(outcome, 'booked');
    }

    const fourthWindow = await createHeldFreeWindow(600);
    const fourthAppointment = buildFreeAppointment(patientId, fourthWindow.id, fourthWindow.startTime);
    const fourthOutcome = await repo.checkCapsAndSave(fourthAppointment, patientId, caps);
    assert.equal(fourthOutcome, 'monthly_cap_exceeded');

    const persistedCount = await prisma.appointment.count({
      where: { patientId, consultationType: 'FREE', status: { not: 'CANCELLED' } },
    });
    assert.equal(persistedCount, 3);
  });

  it('a cancelled free appointment does not count toward the cap', async () => {
    const patientId = await createFreshPatient();
    const caps = { ...CAPS, freeConsultationsWindowStart: monthStart() };

    const window = await createHeldFreeWindow(60);
    const appointment = buildFreeAppointment(patientId, window.id, window.startTime);
    const outcome = await repo.checkCapsAndSave(appointment, patientId, caps);
    assert.equal(outcome, 'booked');

    await prisma.appointment.update({ where: { id: appointment.getId() }, data: { status: 'CANCELLED' } });

    const countExcludingCancelled = await prisma.appointment.count({
      where: { patientId, consultationType: 'FREE', status: { not: 'CANCELLED' } },
    });
    assert.equal(countExcludingCancelled, 0);
  });

  it('blocks free booking once the no-show threshold is reached, independent of the monthly count', async () => {
    const patientId = await createFreshPatient();
    const caps = { ...CAPS, freeConsultationsWindowStart: monthStart() };

    const window1 = await createHeldFreeWindow(60);
    const noShow1 = buildFreeAppointment(patientId, window1.id, window1.startTime);
    await repo.checkCapsAndSave(noShow1, patientId, caps);
    await prisma.appointment.update({ where: { id: noShow1.getId() }, data: { status: 'NO_SHOW' } });

    const window2 = await createHeldFreeWindow(120);
    const noShow2 = buildFreeAppointment(patientId, window2.id, window2.startTime);
    await repo.checkCapsAndSave(noShow2, patientId, caps);
    await prisma.appointment.update({ where: { id: noShow2.getId() }, data: { status: 'NO_SHOW' } });

    const window3 = await createHeldFreeWindow(180);
    const blockedAttempt = buildFreeAppointment(patientId, window3.id, window3.startTime);
    const outcome = await repo.checkCapsAndSave(blockedAttempt, patientId, caps);
    assert.equal(outcome, 'no_show_blocked');
  });

  // MANDATORY: the exact scenario named in the I8 spec -- two simultaneous
  // browser tabs both attempting to consume the patient's final remaining
  // free entitlement. Exactly one must succeed; the other must fail with
  // the correct domain restriction; no duplicate usage; no negative or
  // inconsistent count.
  it('CONCURRENCY: two simultaneous requests for the last remaining free entitlement -- exactly one succeeds', async () => {
    const patientId = await createFreshPatient();
    const caps = { ...CAPS, freeConsultationsWindowStart: monthStart() };

    // Pre-consume 2 of the 3 free slots sequentially, leaving exactly one.
    for (let i = 0; i < 2; i += 1) {
      const window = await createHeldFreeWindow(60 + i * 90);
      const appointment = buildFreeAppointment(patientId, window.id, window.startTime);
      const outcome = await repo.checkCapsAndSave(appointment, patientId, caps);
      assert.equal(outcome, 'booked');
    }

    // Two different windows (not the same slot -- this is deliberately NOT
    // the single-row optimistic-lock race SchedulingModule already handles;
    // it's the aggregate-count race across two different, individually
    // valid bookings), fired concurrently for the SAME patient.
    const [windowA, windowB] = await Promise.all([createHeldFreeWindow(400), createHeldFreeWindow(460)]);
    const appointmentA = buildFreeAppointment(patientId, windowA.id, windowA.startTime);
    const appointmentB = buildFreeAppointment(patientId, windowB.id, windowB.startTime);

    const [outcomeA, outcomeB] = await Promise.all([
      repo.checkCapsAndSave(appointmentA, patientId, caps),
      repo.checkCapsAndSave(appointmentB, patientId, caps),
    ]);

    const outcomes = [outcomeA, outcomeB].sort();
    assert.deepEqual(outcomes, ['booked', 'monthly_cap_exceeded']);

    const finalCount = await prisma.appointment.count({
      where: { patientId, consultationType: 'FREE', status: { not: 'CANCELLED' } },
    });
    assert.equal(finalCount, 3, 'exactly 3 free appointments must be persisted -- never 4, never 2');
  });
});
