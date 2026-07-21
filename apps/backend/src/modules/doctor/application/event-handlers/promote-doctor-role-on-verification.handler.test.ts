import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { UpdateAccountRoleCommand } from '../../../identity/application/use-cases/update-account-role/update-account-role.command.js';
import type { UpdateAccountRoleUseCase } from '../../../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import type { GetDoctorProfileByIdUseCase } from '../use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';

import { PromoteDoctorRoleOnVerificationHandler } from './promote-doctor-role-on-verification.handler.js';

class FakeGetDoctorProfileByIdUseCase implements Pick<GetDoctorProfileByIdUseCase, 'execute'> {
  constructor(private readonly profile: DoctorProfile | null) {}
  execute(): Promise<DoctorProfile | null> {
    return Promise.resolve(this.profile);
  }
}

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

function buildProfile(): DoctorProfile {
  return DoctorProfile.register({
    accountId: '11111111-1111-4111-8111-111111111111',
    licenseNumber: 'LIC-1',
    specialty: 'Cardiology',
  });
}

describe('PromoteDoctorRoleOnVerificationHandler', () => {
  it('promotes the doctor profile\'s account to Doctor on a doctor.verified event', async () => {
    const profile = buildProfile();
    const getDoctorProfile = new FakeGetDoctorProfileByIdUseCase(profile);
    const updateAccountRole = new FakeUpdateAccountRoleUseCase();
    const logger = new FakeLogger();
    const handler = new PromoteDoctorRoleOnVerificationHandler(
      getDoctorProfile as unknown as GetDoctorProfileByIdUseCase,
      updateAccountRole as unknown as UpdateAccountRoleUseCase,
      logger as unknown as PinoLoggerService,
    );

    await handler.handle({ doctorId: profile.getId(), verificationCaseId: 'case-1' });

    assert.equal(updateAccountRole.calls.length, 1);
    assert.equal(updateAccountRole.calls[0].accountId, profile.getAccountId());
    assert.equal(updateAccountRole.calls[0].newRole, AccountRole.Doctor);
    assert.equal(logger.errors.length, 0);
  });

  it('logs (does not throw) when the doctor profile no longer exists', async () => {
    const getDoctorProfile = new FakeGetDoctorProfileByIdUseCase(null);
    const updateAccountRole = new FakeUpdateAccountRoleUseCase();
    const logger = new FakeLogger();
    const handler = new PromoteDoctorRoleOnVerificationHandler(
      getDoctorProfile as unknown as GetDoctorProfileByIdUseCase,
      updateAccountRole as unknown as UpdateAccountRoleUseCase,
      logger as unknown as PinoLoggerService,
    );

    await handler.handle({ doctorId: 'unknown-doctor', verificationCaseId: 'case-1' });

    assert.equal(updateAccountRole.calls.length, 0);
    assert.equal(logger.errors.length, 1);
  });

  it('logs (does not throw) when the role update itself fails', async () => {
    const profile = buildProfile();
    const getDoctorProfile = new FakeGetDoctorProfileByIdUseCase(profile);
    const updateAccountRole = new FakeUpdateAccountRoleUseCase(new Error('db unavailable'));
    const logger = new FakeLogger();
    const handler = new PromoteDoctorRoleOnVerificationHandler(
      getDoctorProfile as unknown as GetDoctorProfileByIdUseCase,
      updateAccountRole as unknown as UpdateAccountRoleUseCase,
      logger as unknown as PinoLoggerService,
    );

    await handler.handle({ doctorId: profile.getId(), verificationCaseId: 'case-1' });

    assert.equal(logger.errors.length, 1);
  });
});
