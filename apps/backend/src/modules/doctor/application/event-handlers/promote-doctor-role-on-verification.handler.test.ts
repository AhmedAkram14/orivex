import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { UpdateAccountRoleCommand } from '../../../identity/application/use-cases/update-account-role/update-account-role.command.js';
import type { UpdateAccountRoleUseCase } from '../../../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';

import { PromoteDoctorRoleOnVerificationHandler } from './promote-doctor-role-on-verification.handler.js';

class FakeUpdateAccountRoleUseCase implements Pick<UpdateAccountRoleUseCase, 'execute'> {
  public readonly calls: UpdateAccountRoleCommand[] = [];
  private readonly shouldThrow: Error | undefined;

  constructor(shouldThrow?: Error) {
    this.shouldThrow = shouldThrow;
  }

  execute(command: UpdateAccountRoleCommand): Promise<never> {
    this.calls.push(command);
    if (this.shouldThrow) return Promise.reject(this.shouldThrow);
    return Promise.resolve() as unknown as Promise<never>;
  }
}

class FakeLogger {
  public readonly errors: unknown[] = [];
  error(...args: unknown[]): void {
    this.errors.push(args);
  }
}

const SUBJECT_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('PromoteDoctorRoleOnVerificationHandler', () => {
  it('promotes the event\'s subjectAccountId to Doctor on a doctor.verified event', async () => {
    const updateAccountRole = new FakeUpdateAccountRoleUseCase();
    const logger = new FakeLogger();
    const handler = new PromoteDoctorRoleOnVerificationHandler(
      updateAccountRole as unknown as UpdateAccountRoleUseCase,
      logger as unknown as PinoLoggerService,
    );

    await handler.handle({ subjectAccountId: SUBJECT_ACCOUNT_ID, verificationCaseId: 'case-1' });

    assert.equal(updateAccountRole.calls.length, 1);
    assert.equal(updateAccountRole.calls[0].accountId, SUBJECT_ACCOUNT_ID);
    assert.equal(updateAccountRole.calls[0].newRole, AccountRole.Doctor);
    assert.equal(logger.errors.length, 0);
  });

  it('logs (does not throw) when the role update itself fails', async () => {
    const updateAccountRole = new FakeUpdateAccountRoleUseCase(new Error('db unavailable'));
    const logger = new FakeLogger();
    const handler = new PromoteDoctorRoleOnVerificationHandler(
      updateAccountRole as unknown as UpdateAccountRoleUseCase,
      logger as unknown as PinoLoggerService,
    );

    await handler.handle({ subjectAccountId: SUBJECT_ACCOUNT_ID, verificationCaseId: 'case-1' });

    assert.equal(logger.errors.length, 1);
  });
});
