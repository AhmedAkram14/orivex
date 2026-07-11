import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { HealthGraph } from '../../../domain/entities/health-graph.entity.js';
import { HealthGraphNodeType } from '../../../domain/enums/health-graph-node-type.enum.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';

import { GetHealthGraphSubgraphUseCase } from './get-health-graph-subgraph.use-case.js';

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

describe('GetHealthGraphSubgraphUseCase', () => {
  it('returns an empty array when no graph exists yet (lazy creation, not an error)', async () => {
    const useCase = new GetHealthGraphSubgraphUseCase(
      new FakeHealthGraphRepository(null),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    );

    const result = await useCase.execute({ patientId: '11111111-1111-4111-8111-111111111111' });

    assert.deepEqual(result, []);
  });

  it('returns all nodes when no rootNodeId is given', async () => {
    const graph = HealthGraph.create('11111111-1111-4111-8111-111111111111');
    graph.addNode({ nodeType: HealthGraphNodeType.Condition, authoringDoctorId: '22222222-2222-4222-8222-222222222222' });
    const useCase = new GetHealthGraphSubgraphUseCase(
      new FakeHealthGraphRepository(graph),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    );

    const result = await useCase.execute({ patientId: '11111111-1111-4111-8111-111111111111' });

    assert.equal(result.length, 1);
  });

  it('scopes to a single node when rootNodeId is given', async () => {
    const graph = HealthGraph.create('11111111-1111-4111-8111-111111111111');
    const node = graph.addNode({
      nodeType: HealthGraphNodeType.Condition,
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
    });
    graph.addNode({ nodeType: HealthGraphNodeType.Symptom, authoringDoctorId: '22222222-2222-4222-8222-222222222222' });
    const useCase = new GetHealthGraphSubgraphUseCase(
      new FakeHealthGraphRepository(graph),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    );

    const result = await useCase.execute({ patientId: '11111111-1111-4111-8111-111111111111', rootNodeId: node.getId() });

    assert.equal(result.length, 1);
    assert.equal(result[0].getId(), node.getId());
  });

  it('throws NotFoundError when the patient does not exist', async () => {
    const useCase = new GetHealthGraphSubgraphUseCase(
      new FakeHealthGraphRepository(null),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
    );

    await assert.rejects(
      () => useCase.execute({ patientId: '99999999-9999-4999-8999-999999999999' }),
      NotFoundError,
    );
  });
});
