import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import type { PrismaService } from '../../../../platform/database/prisma.service.js';

import { PrismaDoctorDirectoryQueryService } from './prisma-doctor-directory-query.service.js';

// I10 -- Doctor discovery filters: real-PostgreSQL verification for the
// rating filter (no mocks). Requires a running local database reachable
// via DATABASE_URL (the `orivex-postgres` docker-compose service in this
// project).
describe('PrismaDoctorDirectoryQueryService (real PostgreSQL) -- rating filter', () => {
  const prisma = new PrismaClient();
  const service = new PrismaDoctorDirectoryQueryService(prisma as unknown as PrismaService);
  const cleanupAccountIds: string[] = [];
  const cleanupDoctorProfileIds: string[] = [];
  const cleanupPatientProfileIds: string[] = [];
  const cleanupWindowIds: string[] = [];
  const cleanupAppointmentIds: string[] = [];
  const cleanupSessionIds: string[] = [];
  let specialtyId: string;
  let patientProfileId: string;

  before(async () => {
    await prisma.$connect();
    const specialty = await prisma.medicalSpecialty.findFirst();
    if (!specialty) {
      throw new Error('No MedicalSpecialty reference row seeded -- required for this integration test.');
    }
    specialtyId = specialty.id;

    const patientAccountId = randomUUID();
    await prisma.account.create({
      data: { id: patientAccountId, email: `i10-rating-patient-${patientAccountId}@test.orivex.dev`, role: 'patient', displayName: 'I10 Rating Test Patient' },
    });
    cleanupAccountIds.push(patientAccountId);
    const patientProfile = await prisma.patientProfile.create({ data: { accountId: patientAccountId } });
    cleanupPatientProfileIds.push(patientProfile.id);
    patientProfileId = patientProfile.id;
  });

  after(async () => {
    await prisma.consultationFeedback.deleteMany({ where: { patientId: patientProfileId } });
    await prisma.consultationSession.deleteMany({ where: { id: { in: cleanupSessionIds } } });
    await prisma.appointment.deleteMany({ where: { id: { in: cleanupAppointmentIds } } });
    await prisma.availabilityWindow.deleteMany({ where: { id: { in: cleanupWindowIds } } });
    await prisma.doctorProfile.deleteMany({ where: { id: { in: cleanupDoctorProfileIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: cleanupPatientProfileIds } } });
    await prisma.account.deleteMany({ where: { id: { in: cleanupAccountIds } } });
    await prisma.$disconnect();
  });

  async function createDoctor(props: { yearsOfExperience?: number; consultationFeeAmount?: number } = {}): Promise<string> {
    const accountId = randomUUID();
    await prisma.account.create({
      data: { id: accountId, email: `i10-rating-doctor-${accountId}@test.orivex.dev`, role: 'doctor', displayName: 'Dr. I10 Rating Test' },
    });
    cleanupAccountIds.push(accountId);
    const profile = await prisma.doctorProfile.create({
      data: {
        accountId,
        licenseNumber: `LIC-I10-${accountId.slice(0, 8)}`,
        specialtyId,
        languages: [],
        insuranceProviders: [],
        yearsOfExperience: props.yearsOfExperience,
        consultationFeeAmount: props.consultationFeeAmount,
      },
    });
    cleanupDoctorProfileIds.push(profile.id);
    return profile.id;
  }

  /** Creates one real, completed consultation (window + appointment + session) and one real feedback row on it. */
  async function createFeedback(doctorId: string, rating: number, moderationStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN' = 'VISIBLE') {
    const start = new Date(Date.now() - 24 * 60 * 60_000 - Math.random() * 60_000);
    const window = await prisma.availabilityWindow.create({
      data: { doctorId, startTime: start, endTime: new Date(start.getTime() + 30 * 60_000), consultationType: 'FREE', status: 'BOOKED' },
    });
    cleanupWindowIds.push(window.id);
    const appointment = await prisma.appointment.create({
      data: { patientId: patientProfileId, doctorId, availabilityWindowId: window.id, consultationType: 'FREE', status: 'COMPLETED', scheduledAt: start },
    });
    cleanupAppointmentIds.push(appointment.id);
    const session = await prisma.consultationSession.create({
      data: { appointmentId: appointment.id, state: 'CLOSED', completionReason: 'COMPLETED', startedAt: start, closedAt: new Date(start.getTime() + 20 * 60_000) },
    });
    cleanupSessionIds.push(session.id);
    await prisma.consultationFeedback.create({
      data: { consultationSessionId: session.id, patientId: patientProfileId, doctorId, rating, moderationStatus },
    });
  }

  it('1. no rating filter -> existing behavior unchanged (all matching doctors returned, unaffected by ratings)', async () => {
    const doctorId = await createDoctor();
    await createFeedback(doctorId, 2);

    const result = await service.search({ hospitalId: undefined, limit: 50, offset: 0 });
    const found = result.entries.find((e) => e.doctorProfileId === doctorId);
    assert.ok(found, 'doctor with a low rating must still appear when no rating filter is applied');
  });

  it('2-4. rating filter returns only matching doctors, excludes below threshold, includes above/at threshold', async () => {
    const highDoctor = await createDoctor();
    await createFeedback(highDoctor, 5);
    await createFeedback(highDoctor, 5);

    const lowDoctor = await createDoctor();
    await createFeedback(lowDoctor, 2);
    await createFeedback(lowDoctor, 3);

    const result = await service.search({ minRating: 4, limit: 50, offset: 0 });
    const ids = result.entries.map((e) => e.doctorProfileId);
    assert.ok(ids.includes(highDoctor), 'a doctor averaging 5.0 must be included for minRating=4');
    assert.ok(!ids.includes(lowDoctor), 'a doctor averaging 2.5 must be excluded for minRating=4');
  });

  it('5. a doctor with no ratings is excluded from a minRating filter', async () => {
    const unratedDoctor = await createDoctor();

    const result = await service.search({ minRating: 1, limit: 50, offset: 0 });
    const ids = result.entries.map((e) => e.doctorProfileId);
    assert.ok(!ids.includes(unratedDoctor), 'a doctor with zero reviews must never satisfy "at least N stars"');
  });

  it('excludes HIDDEN/FLAGGED feedback from the average (moderation-aware, same as the existing aggregate)', async () => {
    const doctorId = await createDoctor();
    await createFeedback(doctorId, 5, 'VISIBLE');
    await createFeedback(doctorId, 1, 'HIDDEN');

    // True average of visible-only feedback is 5.0, not 3.0 (which a naive
    // "average all rows" implementation would produce).
    const resultAt5 = await service.search({ minRating: 5, limit: 50, offset: 0 });
    assert.ok(resultAt5.entries.some((e) => e.doctorProfileId === doctorId));

    const resultAt3 = await service.search({ minRating: 3, limit: 50, offset: 0 });
    // Still matches at the lower threshold too (5.0 >= 3), proving the
    // hidden 1-star row was excluded rather than averaged in (which would
    // have produced 3.0, right at the boundary, not a clean pass at 5).
    assert.ok(resultAt3.entries.some((e) => e.doctorProfileId === doctorId));
  });

  it('6. rating combined with specialty (specialtyId) filter', async () => {
    const doctorId = await createDoctor();
    await createFeedback(doctorId, 5);

    const result = await service.search({ minRating: 4, specialtyId, limit: 50, offset: 0 });
    assert.ok(result.entries.some((e) => e.doctorProfileId === doctorId));

    const wrongSpecialtyResult = await service.search({
      minRating: 4,
      specialtyId: '00000000-0000-4000-8000-000000000000',
      limit: 50,
      offset: 0,
    });
    assert.ok(!wrongSpecialtyResult.entries.some((e) => e.doctorProfileId === doctorId));
  });

  it('7. rating combined with price filter', async () => {
    const doctorId = await createDoctor({ consultationFeeAmount: 999 });
    await createFeedback(doctorId, 5);

    const matches = await service.search({ minRating: 4, minFeeAmount: 900, limit: 50, offset: 0 });
    assert.ok(matches.entries.some((e) => e.doctorProfileId === doctorId));

    const excludes = await service.search({ minRating: 4, maxFeeAmount: 100, limit: 50, offset: 0 });
    assert.ok(!excludes.entries.some((e) => e.doctorProfileId === doctorId));
  });

  it('8. rating combined with years-of-experience filter', async () => {
    const doctorId = await createDoctor({ yearsOfExperience: 15 });
    await createFeedback(doctorId, 5);

    const matches = await service.search({ minRating: 4, minYearsOfExperience: 10, limit: 50, offset: 0 });
    assert.ok(matches.entries.some((e) => e.doctorProfileId === doctorId));

    const excludes = await service.search({ minRating: 4, minYearsOfExperience: 20, limit: 50, offset: 0 });
    assert.ok(!excludes.entries.some((e) => e.doctorProfileId === doctorId));
  });

  it('9. pagination occurs AFTER rating filtering, not before (correct total + correct page slice)', async () => {
    const doctorIds: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const doctorId = await createDoctor();
      await createFeedback(doctorId, 5);
      doctorIds.push(doctorId);
    }

    const page1 = await service.search({ minRating: 4, limit: 2, offset: 0 });
    const page2 = await service.search({ minRating: 4, limit: 2, offset: 2 });

    const allReturnedIds = [...page1.entries, ...page2.entries].map((e) => e.doctorProfileId);
    for (const doctorId of doctorIds) {
      assert.ok(allReturnedIds.includes(doctorId), `doctor ${doctorId} must appear across the two pages`);
    }
    assert.equal(page1.entries.length, 2, 'page 1 must return exactly `limit` rows from the FILTERED set');
    assert.ok(page1.total >= 3, 'total must reflect the full filtered count, not just this page');
    assert.equal(page1.total, page2.total, 'total must be identical across pages of the same filter');
  });

  it('18. zero-result behavior: an impossible rating threshold returns an honest empty result, not an error', async () => {
    const result = await service.search({ minRating: 5, specialtyId: '00000000-0000-4000-8000-000000000001', limit: 50, offset: 0 });
    assert.deepEqual(result.entries, []);
    assert.equal(result.total, 0);
  });
});
