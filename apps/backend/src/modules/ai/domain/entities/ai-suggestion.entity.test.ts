import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AISuggestionDecision } from '../enums/ai-suggestion-decision.enum.js';
import { AISuggestionType } from '../enums/ai-suggestion-type.enum.js';
import { AIDomainError } from '../exceptions/ai-domain.error.js';
import { AISuggestionAlreadyDecidedError } from '../exceptions/ai-suggestion-already-decided.error.js';

import { AISuggestion } from './ai-suggestion.entity.js';

function generateSuggestion(requiresAcknowledgment = false): AISuggestion {
  return AISuggestion.generate({
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    suggestionType: AISuggestionType.SoapDraft,
    content: 'Draft content.',
    confidenceScore: 0.8,
    safetyFlags: [],
    requiresAcknowledgment,
  });
}

describe('AISuggestion', () => {
  it('generates with no decision and records AISuggestionGenerated', () => {
    const suggestion = generateSuggestion();

    assert.equal(suggestion.getDoctorDecision(), undefined);
    assert.equal(suggestion.releaseDomainEvents().length, 1);
  });

  it('records a decision exactly once and records AISuggestionDecided', () => {
    const suggestion = generateSuggestion();
    suggestion.releaseDomainEvents();

    suggestion.recordDecision(AISuggestionDecision.Approved);

    assert.equal(suggestion.getDoctorDecision(), AISuggestionDecision.Approved);
    assert.ok(suggestion.getDecidedAt());
    assert.equal(suggestion.releaseDomainEvents().length, 1);
  });

  it('rejects a second decision call', () => {
    const suggestion = generateSuggestion();
    suggestion.recordDecision(AISuggestionDecision.Approved);

    assert.throws(() => suggestion.recordDecision(AISuggestionDecision.Edited), AISuggestionAlreadyDecidedError);
  });

  it('requires a justification when rejecting a Warning-tier suggestion', () => {
    const suggestion = generateSuggestion(true);

    assert.throws(() => suggestion.recordDecision(AISuggestionDecision.Rejected), AIDomainError);
  });

  it('allows rejecting a Warning-tier suggestion when a justification is provided', () => {
    const suggestion = generateSuggestion(true);

    suggestion.recordDecision(AISuggestionDecision.Rejected, 'Not clinically relevant.');

    assert.equal(suggestion.getDoctorDecision(), AISuggestionDecision.Rejected);
    assert.equal(suggestion.getDecisionJustification(), 'Not clinically relevant.');
  });

  it('allows rejecting a non-Warning-tier suggestion without a justification', () => {
    const suggestion = generateSuggestion(false);

    suggestion.recordDecision(AISuggestionDecision.Rejected);

    assert.equal(suggestion.getDoctorDecision(), AISuggestionDecision.Rejected);
  });
});
