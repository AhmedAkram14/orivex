import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PendingAISuggestionAcknowledgmentRepository } from '../../domain/repositories/pending-ai-suggestion-acknowledgment.repository.js';

import { PendingAISuggestionAcknowledgmentHandler } from './pending-ai-suggestion-acknowledgment.handler.js';

class FakePendingAISuggestionAcknowledgmentRepository implements PendingAISuggestionAcknowledgmentRepository {
  public readonly pending: Array<{ suggestionId: string; consultationSessionId: string }> = [];
  public readonly acknowledged: string[] = [];

  async createPending(suggestionId: string, consultationSessionId: string): Promise<void> {
    this.pending.push({ suggestionId, consultationSessionId });
  }
  async acknowledge(suggestionId: string): Promise<void> {
    this.acknowledged.push(suggestionId);
  }
  async hasUnacknowledged(): Promise<boolean> {
    return this.pending.length > this.acknowledged.length;
  }
}

describe('PendingAISuggestionAcknowledgmentHandler', () => {
  it('tracks a pending acknowledgment when a Warning-tier suggestion is generated', async () => {
    const repository = new FakePendingAISuggestionAcknowledgmentRepository();
    const handler = new PendingAISuggestionAcknowledgmentHandler(repository);

    await handler.handleSuggestionGenerated({
      suggestionId: 'suggestion-1',
      consultationSessionId: 'session-1',
      requiresAcknowledgment: true,
    });

    assert.equal(repository.pending.length, 1);
  });

  it('does not track a suggestion that does not require acknowledgment', async () => {
    const repository = new FakePendingAISuggestionAcknowledgmentRepository();
    const handler = new PendingAISuggestionAcknowledgmentHandler(repository);

    await handler.handleSuggestionGenerated({
      suggestionId: 'suggestion-1',
      consultationSessionId: 'session-1',
      requiresAcknowledgment: false,
    });

    assert.equal(repository.pending.length, 0);
  });

  it('acknowledges a pending suggestion when a decision is recorded', async () => {
    const repository = new FakePendingAISuggestionAcknowledgmentRepository();
    const handler = new PendingAISuggestionAcknowledgmentHandler(repository);
    await handler.handleSuggestionGenerated({
      suggestionId: 'suggestion-1',
      consultationSessionId: 'session-1',
      requiresAcknowledgment: true,
    });

    await handler.handleSuggestionDecided({ suggestionId: 'suggestion-1' });

    assert.equal(repository.acknowledged.length, 1);
  });
});
