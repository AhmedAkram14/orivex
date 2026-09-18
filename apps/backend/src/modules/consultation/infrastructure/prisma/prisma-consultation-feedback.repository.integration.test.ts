import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import type { PrismaService } from '../../../../platform/database/prisma.service.js';

import { PrismaConsultationFeedbackRepository } from './prisma-consultation-feedback.repository.js';

// Phase 0 (Doctor Reports page rebuild): real PostgreSQL only (no mocks),
// same precedent as prisma-free-tier-booking.repository.integration.test.ts.
// Proves getRatingAggregateForDoctorInRange's createdAt-scoped aggregate
// against real rows, and that it never touches the lifetime
// getRatingAggregateForDoctor's own result.
describe('PrismaConsultationFeedbackRepository -- Phase 0 getRatingAggregateForDoctorInRange (real PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const repo = new PrismaConsultationFeedbackRepository(prisma as unknown as PrismaService);
  const cleanupAccountIds: string[] = [];
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
        email: `phase0-feedback-doctor-${doctorAccountId}@test.orivex.dev`,
        role: 'doctor',
        displayName: 'Dr. Phase 0 Feedback Test',
      },
    });
    cleanupAccountIds.push(doctorAccountId);
    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        accountId: doctorAccountId,
        licenseNumber: `LIC-P0F-${doctorAccountId.slice(0, 8)}`,
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
        email: `phase0-feedback-patient-${patientAccountId}@test.orivex.dev`,
        role: 'patient',
        displayName: 'Phase 0 Feedback Test Patient',
      },
    });
    cleanupAccountIds.push(patientAccountId);
    const patientProfile = await prisma.patientProfile.create({ data: { accountId: patientAccountId } });
    patientProfileId = patientProfile.id;
  });

  after(async () => {
    await prisma.consultationFeedback.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.consultationSession.deleteMany({ where: { appointment: { doctorId: doctorProfileId } } });
    await prisma.appointment.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.availabilityWindow.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } });
    await prisma.doctorProfile.deleteMany({ where: { id: doctorProfileId } });
    await prisma.account.deleteMany({ where: { id: { in: cleanupAccountIds } } });
    await prisma.$disconnect();
  });

  // Each feedback row needs its own real Appointment + ConsultationSession
  // (consultationSessionId is a unique FK) -- builds the minimal chain
  // directly via Prisma, same idiom as the free-tier integration test's
  // own fixture helpers.
  async function seedFeedback(opts: { rating: number; comment: string | null; createdAt: Date }): Promise<void> {
    const scheduledAt = opts.createdAt;
    const window = await prisma.availabilityWindow.create({
      data: {
        doctorId: doctorProfileId,
        startTime: scheduledAt,
        endTime: new Date(scheduledAt.getTime() + 30 * 60_000),
        consultationType: 'PAID',
        status: 'BOOKED',
      },
    });
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientProfileId,
        doctorId: doctorProfileId,
        availabilityWindowId: window.id,
        consultationType: 'PAID',
        feeAmount: 100,
        feeCurrency: 'EGP',
        status: 'COMPLETED',
        scheduledAt,
      },
    });
    const session = await prisma.consultationSession.create({
      data: { appointmentId: appointment.id, state: 'CLOSED', createdAt: scheduledAt },
    });
    await prisma.consultationFeedback.create({
      data: {
        consultationSessionId: session.id,
        patientId: patientProfileId,
        doctorId: doctorProfileId,
        rating: opts.rating,
        comment: opts.comment,
        createdAt: opts.createdAt,
      },
    });
  }

  it('averages/counts only reviews whose createdAt falls within [from, to) -- never touching the lifetime aggregate', async () => {
    await seedFeedback({ rating: 5, comment: 'Great doctor', createdAt: new Date('2030-07-05T10:00:00Z') });
    await seedFeedback({ rating: 3, comment: null, createdAt: new Date('2030-07-10T10:00:00Z') });
    // Outside the range -- must not count toward the ranged aggregate.
    await seedFeedback({ rating: 1, comment: 'Bad', createdAt: new Date('2030-08-15T10:00:00Z') });

    const from = new Date('2030-07-01T00:00:00Z');
    const to = new Date('2030-08-01T00:00:00Z');

    const ranged = await repo.getRatingAggregateForDoctorInRange(doctorProfileId, from, to);
    assert.equal(ranged.reviewCount, 2);
    assert.equal(ranged.averageRating, 4);
    assert.equal(ranged.writtenReviewCount, 1);

    const lifetime = await repo.getRatingAggregateForDoctor(doctorProfileId);
    assert.equal(lifetime.reviewCount, 3, 'lifetime aggregate must be unaffected by the new dated method');
    assert.equal(lifetime.writtenReviewCount, 2);
  });
});
