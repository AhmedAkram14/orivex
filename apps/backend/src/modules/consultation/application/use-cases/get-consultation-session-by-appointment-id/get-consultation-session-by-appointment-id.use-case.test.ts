import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import { GetConsultationSessionByAppointmentIdUseCase } from './get-consultation-session-by-appointment-id.use-case.js';

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async save(): Promise<void> {}
}

describe('GetConsultationSessionByAppointmentIdUseCase', () => {
  it('returns the session when it exists for the appointment', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    const useCase = new GetConsultationSessionByAppointmentIdUseCase(new FakeConsultationSessionRepository(session));

    const result = await useCase.execute({ appointmentId: session.getAppointmentId() });

    assert.equal(result?.getId(), session.getId());
  });

  it('returns null (not a thrown error) when no session exists for the appointment', async () => {
    const useCase = new GetConsultationSessionByAppointmentIdUseCase(new FakeConsultationSessionRepository(null));

    const result = await useCase.execute({ appointmentId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(result, null);
  });
});
