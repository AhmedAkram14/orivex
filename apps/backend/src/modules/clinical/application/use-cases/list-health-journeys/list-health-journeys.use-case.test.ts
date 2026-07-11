import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { HealthGraph } from '../../../domain/entities/health-graph.entity.js';
import { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import { HealthGraphNodeType } from '../../../domain/enums/health-graph-node-type.enum.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from '../../../domain/repositories/health-journey.repository.js';

import { ListHealthJourneysUseCase } from './list-health-journeys.use-case.js';

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

class FakeHealthGraphRepository implements HealthGraphRepository {
  constructor(private readonly graph: HealthGraph | null) {}
  async findById(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async findByPatientId(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async save(): Promise<void> {}
}

class FakeHealthJourneyRepository implements HealthJourneyRepository {
  constructor(private readonly journeys: HealthJourney[]) {}
  async findById(): Promise<HealthJourney | null> {
    return null;
  }
  async findByHealthGraphId(): Promise<HealthJourney[]> {
    return this.journeys;
  }
  async save(): Promise<void> {}
}

describe('ListHealthJourneysUseCase', () => {
  it('returns an empty array when no graph exists yet', async () => {
    const useCase = new ListHealthJourneysUseCase(
      new FakeHealthGraphRepository(null),
      new FakeHealthJourneyRepository([]),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    );

    const result = await useCase.execute({ patientId: '11111111-1111-4111-8111-111111111111' });

    assert.deepEqual(result, []);
  });

  it('returns journeys for an existing graph', async () => {
    const graph = HealthGraph.create('11111111-1111-4111-8111-111111111111');
    const node = graph.addNode({
      nodeType: HealthGraphNodeType.Condition,
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
    });
    const journey = HealthJourney.start(graph.getId(), node.getId());
    const useCase = new ListHealthJourneysUseCase(
      new FakeHealthGraphRepository(graph),
      new FakeHealthJourneyRepository([journey]),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    );

    const result = await useCase.execute({ patientId: '11111111-1111-4111-8111-111111111111' });

    assert.equal(result.length, 1);
  });

  it('throws NotFoundError when the patient does not exist', async () => {
    const useCase = new ListHealthJourneysUseCase(
      new FakeHealthGraphRepository(null),
      new FakeHealthJourneyRepository([]),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
    );

    await assert.rejects(
      () => useCase.execute({ patientId: '99999999-9999-4999-8999-999999999999' }),
      NotFoundError,
    );
  });
});
