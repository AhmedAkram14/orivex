import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import type {
  GenerateRoomTokenRequest,
  GenerateRoomTokenResult,
  RoomTokenGeneratorPort,
} from '../../ports/room-token-generator.port.js';

import { MintConsultationRoomTokenCommand } from './mint-consultation-room-token.command.js';
import { MintConsultationRoomTokenUseCase } from './mint-consultation-room-token.use-case.js';

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.session && this.session.getId() === id ? this.session : null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeRoomTokenGenerator implements RoomTokenGeneratorPort {
  public lastRequest: GenerateRoomTokenRequest | undefined;
  constructor(private readonly result: GenerateRoomTokenResult = { token: 'fake-jwt', url: 'wss://fake.livekit.cloud' }) {}
  async generateToken(request: GenerateRoomTokenRequest): Promise<GenerateRoomTokenResult> {
    this.lastRequest = request;
    return this.result;
  }
}

describe('MintConsultationRoomTokenUseCase', () => {
  it('mints a token scoped to the session\'s own room name', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    const repository = new FakeConsultationSessionRepository(session);
    const generator = new FakeRoomTokenGenerator();
    const useCase = new MintConsultationRoomTokenUseCase(repository, generator);

    const result = await useCase.execute(
      new MintConsultationRoomTokenCommand({
        consultationSessionId: session.getId(),
        identity: 'doctor-account-1',
        displayName: 'Dr. Karim Adel',
        role: 'doctor',
      }),
    );

    assert.equal(result.token, 'fake-jwt');
    assert.equal(generator.lastRequest?.roomName, `consultation-${session.getId()}`);
    assert.equal(generator.lastRequest?.identity, 'doctor-account-1');
    assert.equal(generator.lastRequest?.role, 'doctor');
  });

  it('mints a token for an InProgress session (already-started calls can still be rejoined)', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    const repository = new FakeConsultationSessionRepository(session);
    const generator = new FakeRoomTokenGenerator();
    const useCase = new MintConsultationRoomTokenUseCase(repository, generator);

    const result = await useCase.execute(
      new MintConsultationRoomTokenCommand({
        consultationSessionId: session.getId(),
        identity: 'patient-account-1',
        displayName: 'Amina Youssef',
        role: 'patient',
      }),
    );

    assert.ok(result.token);
  });

  it('throws NotFoundError for an unknown session id', async () => {
    const repository = new FakeConsultationSessionRepository(null);
    const useCase = new MintConsultationRoomTokenUseCase(repository, new FakeRoomTokenGenerator());

    await assert.rejects(
      () =>
        useCase.execute(
          new MintConsultationRoomTokenCommand({
            consultationSessionId: '99999999-9999-4999-8999-999999999999',
            identity: 'doctor-account-1',
            displayName: 'Dr. Karim Adel',
            role: 'doctor',
          }),
        ),
      NotFoundError,
    );
  });

  it('rejects minting a token for a Closed session', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    session.close(ConsultationCompletionReason.Completed);
    const repository = new FakeConsultationSessionRepository(session);
    const generator = new FakeRoomTokenGenerator();
    const useCase = new MintConsultationRoomTokenUseCase(repository, generator);

    await assert.rejects(
      () =>
        useCase.execute(
          new MintConsultationRoomTokenCommand({
            consultationSessionId: session.getId(),
            identity: 'doctor-account-1',
            displayName: 'Dr. Karim Adel',
            role: 'doctor',
          }),
        ),
      ConsultationDomainError,
    );
    assert.equal(generator.lastRequest, undefined, 'the gateway must never be called for a closed session');
  });
});
