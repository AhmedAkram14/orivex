import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import type { HealthJourneyRepository } from '../../../domain/repositories/health-journey.repository.js';

import { GetHealthJourneyByIdUseCase } from './get-health-journey-by-id.use-case.js';

class FakeHealthJourneyRepository implements HealthJourneyRepository {
  constructor(private readonly journey: HealthJourney | null) {}
  async findById(): Promise<HealthJourney | null> {
    return this.journey;
  }
  async findByHealthGraphId(): Promise<HealthJourney[]> {
    return [];
  }
  async save(): Promise<void> {}
}

describe('GetHealthJourneyByIdUseCase', () => {
  it('returns the journey when it exists', async () => {
    const journey = HealthJourney.start('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
    const useCase = new GetHealthJourneyByIdUseCase(new FakeHealthJourneyRepository(journey));

    const result = await useCase.execute({ healthJourneyId: journey.getId() });

    assert.equal(result, journey);
  });

  it('returns null when no journey exists', async () => {
    const useCase = new GetHealthJourneyByIdUseCase(new FakeHealthJourneyRepository(null));

    const result = await useCase.execute({ healthJourneyId: 'missing-id' });

    assert.equal(result, null);
  });
});
