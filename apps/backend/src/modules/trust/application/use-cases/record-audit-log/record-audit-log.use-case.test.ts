import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AuditLog } from '../../../domain/entities/audit-log.entity.js';
import { AuditAction } from '../../../domain/enums/audit-action.enum.js';
import { TrustDomainError } from '../../../domain/exceptions/trust-domain.error.js';
import type { AuditLogRepository } from '../../../domain/repositories/audit-log.repository.js';

import { RecordAuditLogCommand } from './record-audit-log.command.js';
import { RecordAuditLogUseCase } from './record-audit-log.use-case.js';

class FakeAuditLogRepository implements AuditLogRepository {
  public readonly recorded: AuditLog[] = [];

  async record(entry: AuditLog): Promise<void> {
    this.recorded.push(entry);
  }
}

describe('RecordAuditLogUseCase', () => {
  it('records an audit log entry and persists it', async () => {
    const repository = new FakeAuditLogRepository();
    const useCase = new RecordAuditLogUseCase(repository);

    const entry = await useCase.execute(
      new RecordAuditLogCommand({
        actorAccountId: '11111111-1111-4111-8111-111111111111',
        actorRole: 'doctor',
        action: AuditAction.HealthGraphRead,
        subjectType: 'patient',
        subjectId: '22222222-2222-4222-8222-222222222222',
        metadata: { rootNodeId: null },
      }),
    );

    assert.equal(entry.getAction(), AuditAction.HealthGraphRead);
    assert.equal(entry.getActorRole(), 'doctor');
    assert.equal(entry.getSubjectType(), 'patient');
    assert.equal(entry.getSubjectId(), '22222222-2222-4222-8222-222222222222');
    assert.equal(entry.getReason(), undefined);
    assert.deepEqual(entry.getMetadata(), { rootNodeId: null });
    assert.equal(repository.recorded.length, 1);
    assert.equal(repository.recorded[0], entry);
  });

  it('records an optional reason (e.g. a verification decision)', async () => {
    const repository = new FakeAuditLogRepository();
    const useCase = new RecordAuditLogUseCase(repository);

    const entry = await useCase.execute(
      new RecordAuditLogCommand({
        actorAccountId: '11111111-1111-4111-8111-111111111111',
        actorRole: 'super_admin',
        action: AuditAction.DoctorVerificationDecided,
        subjectType: 'verification_case',
        subjectId: '33333333-3333-4333-8333-333333333333',
        reason: 'License number confirmed against Syndicate registry.',
      }),
    );

    assert.equal(entry.getReason(), 'License number confirmed against Syndicate registry.');
  });

  it('propagates a domain validation error without persisting anything', async () => {
    const repository = new FakeAuditLogRepository();
    const useCase = new RecordAuditLogUseCase(repository);

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordAuditLogCommand({
            actorAccountId: '',
            actorRole: 'doctor',
            action: AuditAction.HealthGraphRead,
            subjectType: 'patient',
            subjectId: '22222222-2222-4222-8222-222222222222',
          }),
        ),
      TrustDomainError,
    );

    assert.equal(repository.recorded.length, 0);
  });

  it('propagates a domain validation error when subjectId is empty', async () => {
    const repository = new FakeAuditLogRepository();
    const useCase = new RecordAuditLogUseCase(repository);

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordAuditLogCommand({
            actorAccountId: '11111111-1111-4111-8111-111111111111',
            actorRole: 'doctor',
            action: AuditAction.HealthGraphRead,
            subjectType: 'patient',
            subjectId: '',
          }),
        ),
      TrustDomainError,
    );

    assert.equal(repository.recorded.length, 0);
  });
});
