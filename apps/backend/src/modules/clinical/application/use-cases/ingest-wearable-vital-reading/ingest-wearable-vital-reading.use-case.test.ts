import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { VitalReading } from '../../../domain/entities/vital-reading.entity.js';
import { VitalReadingSource } from '../../../domain/enums/vital-reading-source.enum.js';
import { VitalType } from '../../../domain/enums/vital-type.enum.js';
import type { VitalReadingRepository } from '../../../domain/repositories/vital-reading.repository.js';

import { IngestWearableVitalReadingUseCase } from './ingest-wearable-vital-reading.use-case.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeVitalReadingRepository implements VitalReadingRepository {
  public saved: VitalReading[] = [];
  constructor(private readonly existing: VitalReading | null = null) {}
  async findByPatientId(): Promise<VitalReading[]> {
    return this.saved;
  }
  async findByConsultationSessionId(): Promise<VitalReading[]> {
    return this.saved;
  }
  async findBySourceAndExternalId(): Promise<VitalReading | null> {
    return this.existing;
  }
  async save(vitalReading: VitalReading): Promise<void> {
    this.saved.push(vitalReading);
  }
}

describe('IngestWearableVitalReadingUseCase', () => {
  it('throws NotFoundError when the patient does not exist', async () => {
    const useCase = new IngestWearableVitalReadingUseCase(
      new FakeVitalReadingRepository(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          patientId: PATIENT_ID,
          type: VitalType.Weight,
          value: 70,
          recordedAt: new Date('2026-09-01T08:00:00.000Z'),
          sourceProvider: 'apple-health',
          externalObservationId: 'obs-1',
        }),
      NotFoundError,
    );
  });

  it('ingests a new device reading tagged as Device source with the given dedup key', async () => {
    const vitalReadingRepository = new FakeVitalReadingRepository();
    const useCase = new IngestWearableVitalReadingUseCase(
      vitalReadingRepository,
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    );

    const result = await useCase.execute({
      patientId: PATIENT_ID,
      type: VitalType.Weight,
      value: 70.5,
      recordedAt: new Date('2026-09-01T08:00:00.000Z'),
      sourceProvider: 'apple-health',
      externalObservationId: 'obs-1',
    });

    assert.equal(result.getSource(), VitalReadingSource.Device);
    assert.equal(result.getSourceProvider(), 'apple-health');
    assert.equal(result.getExternalObservationId(), 'obs-1');
    assert.equal(result.getRecordedByDoctorId(), undefined);
    assert.equal(result.getConsultationSessionId(), undefined);
    assert.equal(vitalReadingRepository.saved.length, 1);
  });

  it('is idempotent: re-delivering the same (sourceProvider, externalObservationId) returns the existing reading without saving again', async () => {
    const existing = VitalReading.ingestFromDevice({
      patientId: PATIENT_ID,
      type: VitalType.Weight,
      value: 70,
      recordedAt: new Date('2026-09-01T08:00:00.000Z'),
      sourceProvider: 'apple-health',
      externalObservationId: 'obs-1',
    });
    const vitalReadingRepository = new FakeVitalReadingRepository(existing);
    const useCase = new IngestWearableVitalReadingUseCase(
      vitalReadingRepository,
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    );

    const result = await useCase.execute({
      patientId: PATIENT_ID,
      type: VitalType.Weight,
      value: 71,
      recordedAt: new Date('2026-09-01T09:00:00.000Z'),
      sourceProvider: 'apple-health',
      externalObservationId: 'obs-1',
    });

    assert.equal(result, existing);
    assert.equal(vitalReadingRepository.saved.length, 0);
  });
});
