import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AuditLog } from '../../../domain/entities/audit-log.entity.js';
import { AuditAction } from '../../../domain/enums/audit-action.enum.js';
import type {
  AuditLogRepository,
  FindAuditLogEntriesFilter,
  FindAuditLogEntriesResult,
} from '../../../domain/repositories/audit-log.repository.js';

import { ListAuditLogEntriesQuery } from './list-audit-log-entries.query.js';
import { ListAuditLogEntriesUseCase } from './list-audit-log-entries.use-case.js';

class FakeAuditLogRepository implements AuditLogRepository {
  public lastFilter?: FindAuditLogEntriesFilter;
  constructor(private readonly result: FindAuditLogEntriesResult) {}
  async record(): Promise<void> {}
  async findMany(filter: FindAuditLogEntriesFilter): Promise<FindAuditLogEntriesResult> {
    this.lastFilter = filter;
    return this.result;
  }
}

describe('ListAuditLogEntriesUseCase', () => {
  it('translates page/limit into offset/limit and passes every filter through', async () => {
    const entry = AuditLog.record({
      actorAccountId: 'doctor-account-1',
      actorRole: 'doctor',
      action: AuditAction.HealthGraphRead,
      subjectType: 'PatientProfile',
      subjectId: 'patient-1',
    });
    const repository = new FakeAuditLogRepository({ entries: [entry], total: 1 });
    const useCase = new ListAuditLogEntriesUseCase(repository);

    const result = await useCase.execute(
      new ListAuditLogEntriesQuery({
        page: 2,
        limit: 25,
        actorAccountId: 'doctor-account-1',
        action: AuditAction.HealthGraphRead,
      }),
    );

    assert.equal(result.total, 1);
    assert.equal(result.entries[0]?.getId(), entry.getId());
    assert.deepEqual(repository.lastFilter, {
      actorAccountId: 'doctor-account-1',
      subjectType: undefined,
      subjectId: undefined,
      action: AuditAction.HealthGraphRead,
      offset: 25,
      limit: 25,
    });
  });
});
