import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { AISuggestion } from '../../../domain/entities/ai-suggestion.entity.js';
import { AISuggestionDecision } from '../../../domain/enums/ai-suggestion-decision.enum.js';
import { AISuggestionType } from '../../../domain/enums/ai-suggestion-type.enum.js';
import { AIDomainError } from '../../../domain/exceptions/ai-domain.error.js';
import { AISuggestionAlreadyDecidedError } from '../../../domain/exceptions/ai-suggestion-already-decided.error.js';
import type { AISuggestionRepository } from '../../../domain/repositories/ai-suggestion.repository.js';

import { RecordDoctorDecisionCommand } from './record-doctor-decision.command.js';
import { RecordDoctorDecisionUseCase } from './record-doctor-decision.use-case.js';

class FakeAISuggestionRepository implements AISuggestionRepository {
  private readonly byId = new Map<string, AISuggestion>();
  public readonly savedCount = { value: 0 };

  constructor(seed?: AISuggestion) {
    if (seed) {
      this.byId.set(seed.getId(), seed);
    }
  }

  async findById(id: string): Promise<AISuggestion | null> {
    return this.byId.get(id) ?? null;
  }
  async save(suggestion: AISuggestion): Promise<void> {
    this.byId.set(suggestion.getId(), suggestion);
    this.savedCount.value += 1;
  }
}

class NoopDispatcher {
  public readonly dispatched: unknown[][] = [];
  async dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(events);
  }
  subscribe(): void {}
}

function buildWarningTierSuggestion(): AISuggestion {
  return AISuggestion.generate({
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    suggestionType: AISuggestionType.InteractionFlag,
    content: 'Potential interaction detected.',
    safetyFlags: ['interaction'],
    requiresAcknowledgment: true,
  });
}

describe('RecordDoctorDecisionUseCase', () => {
  it('records an approved decision and dispatches the decided event', async () => {
    const suggestion = buildWarningTierSuggestion();
    suggestion.releaseDomainEvents();
    const repository = new FakeAISuggestionRepository(suggestion);
    const dispatcher = new NoopDispatcher();
    const useCase = new RecordDoctorDecisionUseCase(repository, dispatcher);

    const result = await useCase.execute(
      new RecordDoctorDecisionCommand({ suggestionId: suggestion.getId(), decision: AISuggestionDecision.Approved }),
    );

    assert.equal(result.getDoctorDecision(), AISuggestionDecision.Approved);
    assert.equal(dispatcher.dispatched.length, 1);
  });

  it('throws NotFoundError when the suggestion does not exist', async () => {
    const useCase = new RecordDoctorDecisionUseCase(new FakeAISuggestionRepository(), new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new RecordDoctorDecisionCommand({ suggestionId: 'missing-id', decision: AISuggestionDecision.Approved })),
      NotFoundError,
    );
  });

  it('throws AISuggestionAlreadyDecidedError on a second decision call', async () => {
    const suggestion = buildWarningTierSuggestion();
    suggestion.recordDecision(AISuggestionDecision.Approved);
    suggestion.releaseDomainEvents();
    const repository = new FakeAISuggestionRepository(suggestion);
    const useCase = new RecordDoctorDecisionUseCase(repository, new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new RecordDoctorDecisionCommand({ suggestionId: suggestion.getId(), decision: AISuggestionDecision.Edited })),
      AISuggestionAlreadyDecidedError,
    );
  });

  it('throws AIDomainError when rejecting a Warning-tier suggestion without a justification', async () => {
    const suggestion = buildWarningTierSuggestion();
    suggestion.releaseDomainEvents();
    const repository = new FakeAISuggestionRepository(suggestion);
    const useCase = new RecordDoctorDecisionUseCase(repository, new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new RecordDoctorDecisionCommand({ suggestionId: suggestion.getId(), decision: AISuggestionDecision.Rejected })),
      AIDomainError,
    );
  });
});
