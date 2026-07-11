import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import { JourneyStage } from '../../../domain/enums/journey-stage.enum.js';
import type { HealthJourneyRepository } from '../../../domain/repositories/health-journey.repository.js';

import { UpdateJourneyStageCommand } from './update-journey-stage.command.js';
import { UpdateJourneyStageUseCase } from './update-journey-stage.use-case.js';

class FakeHealthJourneyRepository implements HealthJourneyRepository {
  public readonly saved: HealthJourney[] = [];
  constructor(private readonly journey: HealthJourney | null) {}
  async findById(): Promise<HealthJourney | null> {
    return this.journey;
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

describe('UpdateJourneyStageUseCase', () => {
  it('advances the journey stage', async () => {
    const journey = HealthJourney.start('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
    const repo = new FakeHealthJourneyRepository(journey);
    const useCase = new UpdateJourneyStageUseCase(repo, new NoopDispatcher());

    const result = await useCase.execute(
      new UpdateJourneyStageCommand({ healthJourneyId: journey.getId(), nextStage: JourneyStage.FollowUp }),
    );

    assert.equal(result.getStage(), JourneyStage.FollowUp);
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the journey does not exist', async () => {
    const repo = new FakeHealthJourneyRepository(null);
    const useCase = new UpdateJourneyStageUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateJourneyStageCommand({ healthJourneyId: 'missing-id', nextStage: JourneyStage.FollowUp }),
        ),
      NotFoundError,
    );
  });
});
