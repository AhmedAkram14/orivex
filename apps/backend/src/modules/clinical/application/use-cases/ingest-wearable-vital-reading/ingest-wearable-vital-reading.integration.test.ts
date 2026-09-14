import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { PrismaClient } from '@prisma/client';

import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PrismaPatientProfileRepository } from '../../../../patient/infrastructure/prisma/prisma-patient-profile.repository.js';
import type { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { VitalType } from '../../../domain/enums/vital-type.enum.js';
import { PrismaVitalReadingRepository } from '../../../infrastructure/prisma/prisma-vital-reading.repository.js';

import { IngestWearableVitalReadingUseCase } from './ingest-wearable-vital-reading.use-case.js';

// K10 -- mandatory real-PostgreSQL concurrency verification (Final K1-K15
// Pre-Commit Gate). Requires a running local database reachable via
// DATABASE_URL (the `orivex-postgres` docker-compose service in this
// project), same convention as
// prisma-free-tier-booking.repository.integration.test.ts's own
// "CONCURRENCY" test. Proves the exact invariant the gate requires: N
// simultaneous calls for the identical (sourceProvider,
// externalObservationId) must all resolve successfully, all represent the
// same persisted row, and the database must contain exactly one row for
// that key -- no unhandled P2002 may escape to any caller.
describe('IngestWearableVitalReadingUseCase (real PostgreSQL concurrency)', () => {
  const prisma = new PrismaClient();
  const vitalReadingRepository = new PrismaVitalReadingRepository(prisma as unknown as PrismaService);
  const getPatientProfileByIdUseCase = new GetPatientProfileByIdUseCase(
    new PrismaPatientProfileRepository(prisma as unknown as PrismaService),
  );
  const useCase = new IngestWearableVitalReadingUseCase(vitalReadingRepository, getPatientProfileByIdUseCase);
  const cleanupAccountIds: string[] = [];
  const cleanupPatientProfileIds: string[] = [];

  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.vitalReading.deleteMany({ where: { patientId: { in: cleanupPatientProfileIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: cleanupPatientProfileIds } } });
    await prisma.account.deleteMany({ where: { id: { in: cleanupAccountIds } } });
    await prisma.$disconnect();
  });

  async function createFreshPatient(): Promise<string> {
    const accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        email: `k10-concurrency-patient-${accountId}@test.orivex.dev`,
        role: 'patient',
        displayName: 'K10 Concurrency Test Patient',
      },
    });
    cleanupAccountIds.push(accountId);
    const patientProfile = await prisma.patientProfile.create({ data: { accountId } });
    cleanupPatientProfileIds.push(patientProfile.id);
    return patientProfile.id;
  }

  it('is idempotent under sequential re-delivery: the second call returns the first reading, no new row', async () => {
    const patientId = await createFreshPatient();
    const sourceProvider = 'apple-health';
    const externalObservationId = `obs-sequential-${randomUUID()}`;

    const first = await useCase.execute({
      patientId,
      type: VitalType.Weight,
      value: 70,
      recordedAt: new Date(),
      sourceProvider,
      externalObservationId,
    });
    const second = await useCase.execute({
      patientId,
      type: VitalType.Weight,
      value: 71, // deliberately different -- must be ignored, not applied as an update
      recordedAt: new Date(),
      sourceProvider,
      externalObservationId,
    });

    assert.equal(second.getId(), first.getId());
    assert.equal(second.getValue(), 70, 'the second call must never overwrite the already-persisted reading');

    const rowCount = await prisma.vitalReading.count({ where: { sourceProvider, externalObservationId } });
    assert.equal(rowCount, 1);
  });

  // MANDATORY: the exact scenario the Final K1-K15 Pre-Commit Gate names --
  // N truly simultaneous callers submitting the identical dedup key.
  // Exactly one row must be persisted; every caller must resolve
  // successfully with the same logical reading; none may see an unhandled
  // P2002.
  it('CONCURRENCY: 10 simultaneous calls with the identical (sourceProvider, externalObservationId) persist exactly one row', async () => {
    const patientId = await createFreshPatient();
    const sourceProvider = 'fitbit';
    const externalObservationId = `obs-concurrent-${randomUUID()}`;
    const CALL_COUNT = 10;

    const results = await Promise.all(
      Array.from({ length: CALL_COUNT }, (_, i) =>
        useCase.execute({
          patientId,
          type: VitalType.Weight,
          value: 60 + i,
          recordedAt: new Date(),
          sourceProvider,
          externalObservationId,
        }),
      ),
    );

    // All 10 calls resolved (Promise.all would have rejected on the first
    // unhandled error otherwise -- reaching this line already proves no
    // P2002 escaped to any caller).
    assert.equal(results.length, CALL_COUNT);

    const distinctIds = new Set(results.map((reading) => reading.getId()));
    assert.equal(distinctIds.size, 1, 'every caller must resolve with the same logical VitalReading id');

    const rows = await prisma.vitalReading.findMany({ where: { sourceProvider, externalObservationId } });
    assert.equal(rows.length, 1, 'exactly one row must be persisted for this (sourceProvider, externalObservationId)');
    assert.equal(rows[0]!.id, [...distinctIds][0]);
  });
});
