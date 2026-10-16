import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import type { PrismaService } from '../../../../platform/database/prisma.service.js';

import { PrismaConsultationSessionRepository } from './prisma-consultation-session.repository.js';

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
// The sweep's own threshold (StaleConsultationSessionReconciliationService).
const STALE_AFTER_MS = 4 * HOUR;

// Stale-session reconciliation regression (D13): real PostgreSQL only, same
// precedent as prisma-appointment.repository.integration.test.ts. A session
// is created in WaitingRoom when its appointment is confirmed -- often days
// before the visit -- so the sweep must never treat an upcoming appointment's
// session as stale just because nobody has touched it since confirmation.
describe('PrismaConsultationSessionRepository.findStale (real PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const repo = new PrismaConsultationSessionRepository(prisma as unknown as PrismaService);
  const cleanupAccountIds: string[] = [];
  let doctorProfileId: string;
  let patientProfileId: string;
  const now = new Date();
  const cutoff = new Date(now.getTime() - STALE_AFTER_MS);

  before(async () => {
    await prisma.$connect();
    const specialty = await prisma.medicalSpecialty.findFirst();
    if (!specialty) {
      throw new Error('No MedicalSpecialty reference row seeded -- required for this integration test to create a DoctorProfile.');
    }

    const doctorAccountId = randomUUID();
    await prisma.account.create({
      data: { id: doctorAccountId, email: `stale-sweep-doctor-${doctorAccountId}@test.orivex.dev`, role: 'doctor', displayName: 'Dr. Stale Sweep Test' },
    });
    cleanupAccountIds.push(doctorAccountId);
    doctorProfileId = (
      await prisma.doctorProfile.create({
        data: { accountId: doctorAccountId, licenseNumber: `LIC-SS-${doctorAccountId.slice(0, 8)}`, specialtyId: specialty.id, languages: [], insuranceProviders: [] },
      })
    ).id;

    const patientAccountId = randomUUID();
    await prisma.account.create({
      data: { id: patientAccountId, email: `stale-sweep-patient-${patientAccountId}@test.orivex.dev`, role: 'patient', displayName: 'Stale Sweep Test Patient' },
    });
    cleanupAccountIds.push(patientAccountId);
    patientProfileId = (await prisma.patientProfile.create({ data: { accountId: patientAccountId } })).id;
  });

  after(async () => {
    await prisma.consultationSession.deleteMany({ where: { appointment: { doctorId: doctorProfileId } } });
    await prisma.appointment.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.availabilityWindow.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } });
    await prisma.doctorProfile.deleteMany({ where: { id: doctorProfileId } });
    await prisma.account.deleteMany({ where: { id: { in: cleanupAccountIds } } });
    await prisma.$disconnect();
  });

  async function seedSession(opts: {
    appointmentStatus: 'CONFIRMED' | 'NO_SHOW' | 'COMPLETED' | 'CANCELLED';
    scheduledAt: Date;
    state: 'WAITING_ROOM' | 'IN_PROGRESS' | 'CLOSED';
    updatedAt: Date;
  }): Promise<string> {
    const window = await prisma.availabilityWindow.create({
      data: {
        doctorId: doctorProfileId,
        startTime: opts.scheduledAt,
        endTime: new Date(opts.scheduledAt.getTime() + 30 * 60_000),
        consultationType: 'FREE',
        status: 'BOOKED',
      },
    });
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientProfileId,
        doctorId: doctorProfileId,
        availabilityWindowId: window.id,
        consultationType: 'FREE',
        status: opts.appointmentStatus,
        scheduledAt: opts.scheduledAt,
      },
    });
    const session = await prisma.consultationSession.create({
      data: {
        appointmentId: appointment.id,
        state: opts.state,
        completionReason: opts.state === 'CLOSED' ? 'COMPLETED' : null,
        startedAt: opts.state === 'WAITING_ROOM' ? null : opts.scheduledAt,
        closedAt: opts.state === 'CLOSED' ? new Date(opts.scheduledAt.getTime() + 25 * 60_000) : null,
        createdAt: opts.updatedAt,
        updatedAt: opts.updatedAt,
      },
    });
    // @updatedAt is set by Prisma on write; pin it to the scenario's value.
    await prisma.$executeRaw`UPDATE "ConsultationSession" SET "updatedAt" = ${opts.updatedAt} WHERE id = ${session.id}`;
    return session.id;
  }

  it('never returns the session of an upcoming appointment, however long ago it was confirmed', async () => {
    const upcoming = await seedSession({
      appointmentStatus: 'CONFIRMED',
      scheduledAt: new Date(now.getTime() + 2 * DAY),
      state: 'WAITING_ROOM',
      updatedAt: new Date(now.getTime() - 3 * DAY),
    });
    const stale = (await repo.findStale(cutoff)).map((session) => session.getId());
    assert.equal(stale.includes(upcoming), false);
  });

  it('never returns an active consultation that is still being updated', async () => {
    const active = await seedSession({
      appointmentStatus: 'CONFIRMED',
      scheduledAt: new Date(now.getTime() - 20 * 60_000),
      state: 'IN_PROGRESS',
      updatedAt: new Date(now.getTime() - 5 * 60_000),
    });
    const stale = (await repo.findStale(cutoff)).map((session) => session.getId());
    assert.equal(stale.includes(active), false);
  });

  it('returns a genuinely abandoned session: its slot started long ago and nobody touched it since', async () => {
    const leftWaiting = await seedSession({
      appointmentStatus: 'NO_SHOW',
      scheduledAt: new Date(now.getTime() - 6 * HOUR),
      state: 'WAITING_ROOM',
      updatedAt: new Date(now.getTime() - 2 * DAY),
    });
    const leftInProgress = await seedSession({
      appointmentStatus: 'CONFIRMED',
      scheduledAt: new Date(now.getTime() - 9 * HOUR),
      state: 'IN_PROGRESS',
      updatedAt: new Date(now.getTime() - 8 * HOUR),
    });
    const stale = (await repo.findStale(cutoff)).map((session) => session.getId());
    assert.equal(stale.includes(leftWaiting), true);
    assert.equal(stale.includes(leftInProgress), true);
  });

  it('never returns an already completed (closed) consultation', async () => {
    const completed = await seedSession({
      appointmentStatus: 'COMPLETED',
      scheduledAt: new Date(now.getTime() - 2 * DAY),
      state: 'CLOSED',
      updatedAt: new Date(now.getTime() - 2 * DAY),
    });
    const stale = (await repo.findStale(cutoff)).map((session) => session.getId());
    assert.equal(stale.includes(completed), false);
  });

  it('returns the leftover session of a cancelled appointment only once its slot is long past', async () => {
    const cancelledUpcoming = await seedSession({
      appointmentStatus: 'CANCELLED',
      scheduledAt: new Date(now.getTime() + 1 * DAY),
      state: 'WAITING_ROOM',
      updatedAt: new Date(now.getTime() - 2 * DAY),
    });
    const cancelledPast = await seedSession({
      appointmentStatus: 'CANCELLED',
      scheduledAt: new Date(now.getTime() - 1 * DAY),
      state: 'WAITING_ROOM',
      updatedAt: new Date(now.getTime() - 3 * DAY),
    });
    const stale = (await repo.findStale(cutoff)).map((session) => session.getId());
    assert.equal(stale.includes(cancelledUpcoming), false);
    assert.equal(stale.includes(cancelledPast), true);
  });
});
