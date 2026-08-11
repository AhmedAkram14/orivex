import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import { GetConsultationSessionByIdUseCase } from './get-consultation-session-by-id.use-case.js';

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
}

describe('GetConsultationSessionByIdUseCase', () => {
  it('returns the session when it exists', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    const useCase = new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(session));

    const result = await useCase.execute({ consultationSessionId: session.getId() });

    assert.equal(result?.getId(), session.getId());
  });

  it('returns null (not a thrown error) when the session does not exist', async () => {
    const useCase = new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(null));

    const result = await useCase.execute({ consultationSessionId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(result, null);
  });
});
