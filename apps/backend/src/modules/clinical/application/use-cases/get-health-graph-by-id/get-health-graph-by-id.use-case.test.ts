import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HealthGraph } from '../../../domain/entities/health-graph.entity.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';

import { GetHealthGraphByIdUseCase } from './get-health-graph-by-id.use-case.js';

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

describe('GetHealthGraphByIdUseCase', () => {
  it('returns the graph when it exists', async () => {
    const graph = HealthGraph.create('11111111-1111-4111-8111-111111111111');
    const useCase = new GetHealthGraphByIdUseCase(new FakeHealthGraphRepository(graph));

    const result = await useCase.execute({ healthGraphId: graph.getId() });

    assert.equal(result, graph);
  });

  it('returns null when no graph exists', async () => {
    const useCase = new GetHealthGraphByIdUseCase(new FakeHealthGraphRepository(null));

    const result = await useCase.execute({ healthGraphId: 'missing-id' });

    assert.equal(result, null);
  });
});
