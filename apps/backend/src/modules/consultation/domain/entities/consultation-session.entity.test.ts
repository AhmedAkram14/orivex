import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationCompletionReason } from '../enums/consultation-completion-reason.enum.js';
import { ConsultationState } from '../enums/consultation-state.enum.js';
import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

import { ConsultationSession } from './consultation-session.entity.js';

describe('ConsultationSession', () => {
  it('opens in WaitingRoom', () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    assert.equal(session.getState(), ConsultationState.WaitingRoom);
  });

  it('starts, transitioning to InProgress', () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();

    assert.equal(session.getState(), ConsultationState.InProgress);
    assert.ok(session.getStartedAt());
    assert.equal(session.releaseDomainEvents().length, 1);
  });

  it('rejects starting a non-WaitingRoom session', () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    assert.throws(() => session.start(), ConsultationDomainError);
  });

  it('closes with a completed outcome and records ConsultationCompleted', () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    session.releaseDomainEvents();

    session.close(ConsultationCompletionReason.Completed);

    assert.equal(session.getState(), ConsultationState.Closed);
    assert.equal(session.getCompletionReason(), ConsultationCompletionReason.Completed);
    assert.ok(session.getClosedAt());
    assert.equal(session.releaseDomainEvents().length, 1);
  });

  it('closes with an interrupted outcome and records ConsultationInterrupted', () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    session.releaseDomainEvents();

    session.close(ConsultationCompletionReason.InterruptedTechnical);

    assert.equal(session.getState(), ConsultationState.Closed);
    assert.equal(session.getCompletionReason(), ConsultationCompletionReason.InterruptedTechnical);
  });

  it('rejects closing a session that is not InProgress', () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    assert.throws(() => session.close(ConsultationCompletionReason.Completed), ConsultationDomainError);
  });

  it('records a connection log before closing', () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.addConnectionLog('Patient reconnected');

    assert.equal(session.getConnectionLogs().length, 1);
    assert.equal(session.getConnectionLogs()[0].getNote(), 'Patient reconnected');
  });

  it('rejects recording a connection log after closing', () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    session.close(ConsultationCompletionReason.Completed);

    assert.throws(() => session.addConnectionLog('too late'), ConsultationDomainError);
  });
});
