import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import { ConsultationState } from '../../../domain/enums/consultation-state.enum.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import { StartConsultationCommand } from './start-consultation.command.js';
import { StartConsultationUseCase } from './start-consultation.use-case.js';

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  public readonly saved: ConsultationSession[] = [];
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(session: ConsultationSession): Promise<void> {
    this.saved.push(session);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}
}

describe('StartConsultationUseCase', () => {
  it('transitions a WaitingRoom session to InProgress', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    const repo = new FakeConsultationSessionRepository(session);
    const useCase = new StartConsultationUseCase(repo, new NoopDispatcher());

    const result = await useCase.execute(new StartConsultationCommand({ consultationSessionId: session.getId() }));

    assert.equal(result.getState(), ConsultationState.InProgress);
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the session does not exist', async () => {
    const repo = new FakeConsultationSessionRepository(null);
    const useCase = new StartConsultationUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new StartConsultationCommand({ consultationSessionId: 'missing-id' })),
      NotFoundError,
    );
  });
});
