import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import { RecordSessionConnectionLogCommand } from './record-session-connection-log.command.js';
import { RecordSessionConnectionLogUseCase } from './record-session-connection-log.use-case.js';

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  public readonly saved: ConsultationSession[] = [];
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.session && this.session.getId() === id ? this.session : null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(session: ConsultationSession): Promise<void> {
    this.saved.push(session);
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
}

describe('RecordSessionConnectionLogUseCase', () => {
  it('appends a connection log entry to an open session and persists it', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    const repository = new FakeConsultationSessionRepository(session);
    const useCase = new RecordSessionConnectionLogUseCase(repository);

    await useCase.execute(
      new RecordSessionConnectionLogCommand({ consultationSessionId: session.getId(), note: 'participant_joined: doctor-1' }),
    );

    assert.equal(session.getConnectionLogs().length, 1);
    assert.equal(session.getConnectionLogs()[0]?.getNote(), 'participant_joined: doctor-1');
    assert.equal(repository.saved.length, 1);
  });

  it('is a silent no-op for an unknown session id (never throws)', async () => {
    const repository = new FakeConsultationSessionRepository(null);
    const useCase = new RecordSessionConnectionLogUseCase(repository);

    await useCase.execute(
      new RecordSessionConnectionLogCommand({ consultationSessionId: '99999999-9999-4999-8999-999999999999', note: 'x' }),
    );

    assert.equal(repository.saved.length, 0);
  });

  it('is a silent no-op for an already-Closed session (never throws)', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    session.close(ConsultationCompletionReason.Completed);
    const repository = new FakeConsultationSessionRepository(session);
    const useCase = new RecordSessionConnectionLogUseCase(repository);

    await useCase.execute(
      new RecordSessionConnectionLogCommand({ consultationSessionId: session.getId(), note: 'participant_left: doctor-1' }),
    );

    assert.equal(session.getConnectionLogs().length, 0);
    assert.equal(repository.saved.length, 0);
  });
});
