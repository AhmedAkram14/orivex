import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { ListSecurityEventsForAccountUseCase } from '../../../../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import type { SecurityEventRepository } from '../../../../trust/domain/repositories/security-event.repository.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import { Session } from '../../../domain/entities/session.entity.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';

import { GetSecuritySummaryUseCase } from './get-security-summary.use-case.js';

class FakeCredentialRepository implements CredentialRepository {
  constructor(private readonly credentials: Credential[]) {}
  async findByAccountId(accountId: string): Promise<Credential | null> {
    return this.credentials.find((credential) => credential.getAccountId() === accountId) ?? null;
  }
  async findById(id: string): Promise<Credential | null> {
    return this.credentials.find((credential) => credential.getId() === id) ?? null;
  }
  async save(): Promise<void> {}
}

class FakeSessionRepository implements SessionRepository {
  constructor(private readonly sessions: Session[]) {}
  async findById(): Promise<Session | null> {
    return null;
  }
  async findByRefreshTokenHash(): Promise<Session | null> {
    return null;
  }
  async findAllActiveForCredential(credentialId: string): Promise<Session[]> {
    return this.sessions.filter((session) => session.getCredentialId() === credentialId);
  }
  async save(): Promise<void> {}
  async revokeAllForCredential(): Promise<void> {}
}

class FakeSecurityEventRepository implements SecurityEventRepository {
  constructor(private readonly events: SecurityEvent[]) {}
  async record(): Promise<void> {}
  async findByAccountId(accountId: string): Promise<SecurityEvent[]> {
    return this.events.filter((event) => event.getAccountId() === accountId);
  }
}

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('GetSecuritySummaryUseCase', () => {
  it('returns null when no credential exists for the account', async () => {
    const useCase = new GetSecuritySummaryUseCase(
      new FakeCredentialRepository([]),
      new FakeSessionRepository([]),
      new ListSecurityEventsForAccountUseCase(new FakeSecurityEventRepository([])),
    );

    const result = await useCase.execute({ accountId: 'nobody' });

    assert.equal(result, null);
  });

  it('reports the active session count, most recent successful login, and null passwordChangedAt when never changed', async () => {
    const credential = Credential.register({ accountId: ACCOUNT_ID, passwordHash: PasswordHash.create('hashed:pw') });
    const sessionA = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:a'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const sessionB = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:b'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const olderLogin = SecurityEvent.record({ accountId: ACCOUNT_ID, eventType: SecurityEventType.LoginSucceeded });
    const newerLogin = SecurityEvent.record({ accountId: ACCOUNT_ID, eventType: SecurityEventType.LoginSucceeded });

    const useCase = new GetSecuritySummaryUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([sessionA, sessionB]),
      new ListSecurityEventsForAccountUseCase(new FakeSecurityEventRepository([olderLogin, newerLogin])),
    );

    const result = await useCase.execute({ accountId: ACCOUNT_ID });

    assert.ok(result);
    assert.equal(result.activeSessionCount, 2);
    assert.ok(result.lastSuccessfulLogin);
    assert.equal(result.passwordChangedAt, null);
    assert.equal(result.twoFactorEnabled, false);
  });

  it('reports the most recent PasswordChanged event as passwordChangedAt', async () => {
    const credential = Credential.register({ accountId: ACCOUNT_ID, passwordHash: PasswordHash.create('hashed:pw') });
    const passwordChanged = SecurityEvent.record({ accountId: ACCOUNT_ID, eventType: SecurityEventType.PasswordChanged });

    const useCase = new GetSecuritySummaryUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([]),
      new ListSecurityEventsForAccountUseCase(new FakeSecurityEventRepository([passwordChanged])),
    );

    const result = await useCase.execute({ accountId: ACCOUNT_ID });

    assert.ok(result);
    assert.deepEqual(result.passwordChangedAt, passwordChanged.getDetectedAt());
  });
});
