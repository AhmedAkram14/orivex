import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';

import { GetSchedulingRulesUseCase } from './get-scheduling-rules.use-case.js';

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

function buildUseCase(profile: DoctorProfile | null): GetSchedulingRulesUseCase {
  return new GetSchedulingRulesUseCase(new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(profile)));
}

function buildDoctorProfile(bufferMinutesOverride?: number): DoctorProfile {
  return DoctorProfile.register({
    accountId: 'account-1',
    licenseNumber: 'LIC-1',
    specialtyId: '11111111-1111-4111-8111-111111111111',
    bufferMinutesOverride,
  });
}

describe('GetSchedulingRulesUseCase', () => {
  it('returns the flat global default bufferMinutes when no doctorId is given', async () => {
    const useCase = buildUseCase(null);

    const result = await useCase.execute();

    assert.deepEqual(result, {
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      minNoticeMinutes: 15,
      maxBookingWindowDays: 30,
    });
  });

  it('uses the doctor\'s own bufferMinutesOverride when one is set', async () => {
    const profile = buildDoctorProfile(20);
    const useCase = buildUseCase(profile);

    const result = await useCase.execute(profile.getId());

    assert.equal(result.bufferMinutes, 20);
    // Everything else stays the flat constant.
    assert.equal(result.slotDurationMinutes, 30);
    assert.equal(result.minNoticeMinutes, 15);
    assert.equal(result.maxBookingWindowDays, 30);
  });

  it('falls back to the flat global default when a doctorId is given but no override is set', async () => {
    const profile = buildDoctorProfile(undefined);
    const useCase = buildUseCase(profile);

    const result = await useCase.execute(profile.getId());

    assert.equal(result.bufferMinutes, 5);
  });

  it('falls back to the flat global default when the doctor profile cannot be found', async () => {
    const useCase = buildUseCase(null);

    const result = await useCase.execute('99999999-9999-4999-8999-999999999999');

    assert.equal(result.bufferMinutes, 5);
  });
});
