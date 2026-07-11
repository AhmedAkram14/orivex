import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { HealthGraph } from '../../../domain/entities/health-graph.entity.js';
import { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import { HealthGraphNodeType } from '../../../domain/enums/health-graph-node-type.enum.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from '../../../domain/repositories/health-journey.repository.js';

import { RecordDiagnosisCommand } from './record-diagnosis.command.js';
import { RecordDiagnosisUseCase } from './record-diagnosis.use-case.js';

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

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeHealthGraphRepository implements HealthGraphRepository {
  public readonly saved: HealthGraph[] = [];
  async findById(): Promise<HealthGraph | null> {
    return null;
  }
  async findByPatientId(): Promise<HealthGraph | null> {
    return null;
  }
  async save(graph: HealthGraph): Promise<void> {
    this.saved.push(graph);
  }
}

class FakeHealthJourneyRepository implements HealthJourneyRepository {
  public readonly saved: HealthJourney[] = [];
  async findById(): Promise<HealthJourney | null> {
    return null;
  }
  async findByHealthGraphId(): Promise<HealthJourney[]> {
    return [];
  }
  async save(journey: HealthJourney): Promise<void> {
    this.saved.push(journey);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

describe('RecordDiagnosisUseCase', () => {
  it('lazily creates the HealthGraph and records a node', async () => {
    const graphRepo = new FakeHealthGraphRepository();
    const useCase = new RecordDiagnosisUseCase(
      graphRepo,
      new FakeHealthJourneyRepository(),
      new NoopDispatcher(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository({} as DoctorProfile)),
    );

    const result = await useCase.execute(
      new RecordDiagnosisCommand({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        nodeType: HealthGraphNodeType.Condition,
        freeTextDescription: 'Hypertension',
      }),
    );

    assert.equal(result.node.getFreeTextDescription(), 'Hypertension');
    assert.equal(result.journey, undefined);
    assert.equal(graphRepo.saved.length, 1);
  });

  it('starts a HealthJourney when requested', async () => {
    const journeyRepo = new FakeHealthJourneyRepository();
    const useCase = new RecordDiagnosisUseCase(
      new FakeHealthGraphRepository(),
      journeyRepo,
      new NoopDispatcher(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository({} as DoctorProfile)),
    );

    const result = await useCase.execute(
      new RecordDiagnosisCommand({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        nodeType: HealthGraphNodeType.Condition,
        startJourney: true,
      }),
    );

    assert.ok(result.journey);
    assert.equal(result.journey?.getRootNodeId(), result.node.getId());
    assert.equal(journeyRepo.saved.length, 1);
  });

  it('throws NotFoundError when the patient does not exist', async () => {
    const useCase = new RecordDiagnosisUseCase(
      new FakeHealthGraphRepository(),
      new FakeHealthJourneyRepository(),
      new NoopDispatcher(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository({} as DoctorProfile)),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordDiagnosisCommand({
            patientId: '99999999-9999-4999-8999-999999999999',
            doctorId: '22222222-2222-4222-8222-222222222222',
            nodeType: HealthGraphNodeType.Condition,
          }),
        ),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the doctor does not exist', async () => {
    const useCase = new RecordDiagnosisUseCase(
      new FakeHealthGraphRepository(),
      new FakeHealthJourneyRepository(),
      new NoopDispatcher(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(null)),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordDiagnosisCommand({
            patientId: '11111111-1111-4111-8111-111111111111',
            doctorId: 'missing-id',
            nodeType: HealthGraphNodeType.Condition,
          }),
        ),
      NotFoundError,
    );
  });
});
