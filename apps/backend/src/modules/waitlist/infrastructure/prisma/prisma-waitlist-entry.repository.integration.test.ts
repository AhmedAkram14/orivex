import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import type { PrismaService } from '../../../../platform/database/prisma.service.js';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';

import { PrismaWaitlistEntryRepository } from './prisma-waitlist-entry.repository.js';

// N8-Waitlist, mandatory concurrency verification. Real PostgreSQL only (no
// mocks) -- requires a running local database reachable via DATABASE_URL
// (the `orivex-postgres` docker-compose service, matching I8's own real-DB
// integration test pattern exactly). Proves claimEarliestEligibleEntry's
// atomicity: for a given doctor+opportunity, concurrent match attempts must
// never claim the same entry twice, and the earliest-created eligible entry
// always wins.
describe('PrismaWaitlistEntryRepository (real PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const repo = new PrismaWaitlistEntryRepository(prisma as unknown as PrismaService);
  const cleanupAccountIds: string[] = [];
  const cleanupPatientProfileIds: string[] = [];
  let doctorProfileId: string;

  before(async () => {
    await prisma.$connect();

    const specialty = await prisma.medicalSpecialty.findFirst();
    if (!specialty) {
      throw new Error('No MedicalSpecialty reference row seeded -- required for this integration test to create a DoctorProfile.');
    }

    const doctorAccountId = randomUUID();
    await prisma.account.create({
      data: {
        id: doctorAccountId,
        email: `n8-waitlist-doctor-${doctorAccountId}@test.orivex.dev`,
        role: 'doctor',
        displayName: 'Dr. N8 Waitlist Test',
      },
    });
    cleanupAccountIds.push(doctorAccountId);

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        accountId: doctorAccountId,
        licenseNumber: `LIC-N8-${doctorAccountId.slice(0, 8)}`,
        specialtyId: specialty.id,
        languages: [],
        insuranceProviders: [],
      },
    });
    doctorProfileId = doctorProfile.id;
  });

  // Every test shares the same doctorProfileId (creating a fresh
  // DoctorProfile per test would mean a fresh MedicalSpecialty/Account
  // round-trip each time, an expensive and unnecessary setup cost here) --
  // claimEarliestEligibleEntry's own WHERE clause is scoped by doctorId,
  // not by any single test's own entries, so a WAITING row left over from
  // an earlier test in this file would otherwise be a second, unintended
  // "eligible entry" candidate for a later test's assertions. Clearing
  // between tests keeps each test's candidate pool exactly what it created.
  beforeEach(async () => {
    await prisma.waitlistEntry.deleteMany({ where: { doctorId: doctorProfileId } });
  });

  after(async () => {
    await prisma.waitlistEntry.deleteMany({ where: { doctorId: doctorProfileId } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: cleanupPatientProfileIds } } });
    await prisma.doctorProfile.deleteMany({ where: { id: doctorProfileId } });
    await prisma.account.deleteMany({ where: { id: { in: cleanupAccountIds } } });
    await prisma.$disconnect();
  });

  async function createFreshPatient(): Promise<string> {
    const accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        email: `n8-waitlist-patient-${accountId}@test.orivex.dev`,
        role: 'patient',
        displayName: 'N8 Waitlist Test Patient',
      },
    });
    cleanupAccountIds.push(accountId);
    const patientProfile = await prisma.patientProfile.create({ data: { accountId } });
    cleanupPatientProfileIds.push(patientProfile.id);
    return patientProfile.id;
  }

  function buildWaitingEntry(patientId: string, offsetMs = 0): WaitlistEntry {
    const now = Date.now();
    return WaitlistEntry.join({
      patientId,
      doctorId: doctorProfileId,
      earliestAcceptableAt: new Date(now + 60_000 + offsetMs),
      latestAcceptableAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    });
  }

  it('claims the earliest-created eligible entry, in FIFO order', async () => {
    const patientA = await createFreshPatient();
    const patientB = await createFreshPatient();
    const entryA = buildWaitingEntry(patientA);
    await repo.save(entryA);
    // Ensure a strictly later createdAt for entryB (real clock, not the
    // fake in-memory ordering the unit test already covers).
    await new Promise((resolve) => setTimeout(resolve, 20));
    const entryB = buildWaitingEntry(patientB);
    await repo.save(entryB);

    const windowStart = new Date(Date.now() + 5 * 60_000);
    const claimed = await repo.claimEarliestEligibleEntry(doctorProfileId, windowStart, 'FREE');

    assert.ok(claimed);
    assert.equal(claimed!.getId(), entryA.getId());
    assert.equal(claimed!.getStatus(), WaitlistEntryStatus.Notified);

    const reloaded = await repo.findById(entryA.getId());
    assert.equal(reloaded!.getStatus(), WaitlistEntryStatus.Notified);
  });

  it('never claims the same entry twice under concurrent calls for the same opportunity', async () => {
    const patient = await createFreshPatient();
    const entry = buildWaitingEntry(patient);
    await repo.save(entry);

    const windowStart = new Date(Date.now() + 5 * 60_000);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => repo.claimEarliestEligibleEntry(doctorProfileId, windowStart, 'FREE')),
    );

    const successes = results.filter((r) => r !== null);
    assert.equal(successes.length, 1, 'exactly one of the 8 concurrent claim attempts should have succeeded');
    assert.equal(successes[0]!.getId(), entry.getId());
  });

  it('does not claim an entry whose date range excludes the window start', async () => {
    const patient = await createFreshPatient();
    const now = Date.now();
    const entry = WaitlistEntry.join({
      patientId: patient,
      doctorId: doctorProfileId,
      earliestAcceptableAt: new Date(now + 100 * 24 * 60 * 60 * 1000),
      latestAcceptableAt: new Date(now + 101 * 24 * 60 * 60 * 1000),
    });
    await repo.save(entry);

    const claimed = await repo.claimEarliestEligibleEntry(doctorProfileId, new Date(now + 60_000), 'FREE');

    assert.equal(claimed, null);
  });

  it('does not claim an entry whose consultation-type preference excludes the window type', async () => {
    const patient = await createFreshPatient();
    const now = Date.now();
    const entry = WaitlistEntry.join({
      patientId: patient,
      doctorId: doctorProfileId,
      consultationType: undefined,
      earliestAcceptableAt: new Date(now + 60_000),
      latestAcceptableAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    });
    await repo.save(entry);
    // Overwrite to Paid preference directly to avoid depending on a second
    // domain constructor path -- reconstitute with a Paid preference is
    // exactly what the real repository round-trips, proven by the mapper's
    // own coverage; this test only needs the filter to actually apply.
    await prisma.waitlistEntry.update({ where: { id: entry.getId() }, data: { consultationType: 'PAID' } });

    const claimed = await repo.claimEarliestEligibleEntry(doctorProfileId, new Date(now + 65_000), 'FREE');

    assert.equal(claimed, null);
  });

  it('a Cancelled entry is never claimed, even though it would otherwise match', async () => {
    const patient = await createFreshPatient();
    const entry = buildWaitingEntry(patient);
    await repo.save(entry);
    entry.cancel();
    await repo.update(entry);

    const claimed = await repo.claimEarliestEligibleEntry(doctorProfileId, new Date(Date.now() + 5 * 60_000), 'FREE');

    assert.equal(claimed, null);
  });

  it('a Notified entry (already matched once) is never claimed again', async () => {
    const patient = await createFreshPatient();
    const entry = buildWaitingEntry(patient);
    await repo.save(entry);
    const windowStart = new Date(Date.now() + 5 * 60_000);
    const firstClaim = await repo.claimEarliestEligibleEntry(doctorProfileId, windowStart, 'FREE');
    assert.ok(firstClaim);

    const secondClaim = await repo.claimEarliestEligibleEntry(doctorProfileId, windowStart, 'FREE');

    assert.equal(secondClaim, null);
  });

  it('hasActiveEntry is true for Waiting/Notified and false for Cancelled', async () => {
    const patient = await createFreshPatient();
    assert.equal(await repo.hasActiveEntry(patient, doctorProfileId), false);

    const entry = buildWaitingEntry(patient);
    await repo.save(entry);
    assert.equal(await repo.hasActiveEntry(patient, doctorProfileId), true);

    entry.cancel();
    await repo.update(entry);
    assert.equal(await repo.hasActiveEntry(patient, doctorProfileId), false);
  });

  it('listByPatientId returns only that patient\'s own entries', async () => {
    const patientA = await createFreshPatient();
    const patientB = await createFreshPatient();
    await repo.save(buildWaitingEntry(patientA));
    await repo.save(buildWaitingEntry(patientB));

    const entriesForA = await repo.listByPatientId(patientA);

    assert.equal(entriesForA.length, 1);
    assert.equal(entriesForA[0]!.getPatientId(), patientA);
  });
});
