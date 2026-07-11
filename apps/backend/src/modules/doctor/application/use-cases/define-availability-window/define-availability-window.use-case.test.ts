import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import { DoctorDomainError } from '../../../domain/exceptions/doctor-domain.error.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';
import type { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import { DefineAvailabilityWindowCommand } from './define-availability-window.command.js';
import { DefineAvailabilityWindowUseCase } from './define-availability-window.use-case.js';

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

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  public readonly saved: AvailabilityWindow[] = [];
  constructor(private readonly overlapping: AvailabilityWindow[] = []) {}
  async findById(): Promise<AvailabilityWindow | null> {
    return null;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return this.overlapping;
  }
  async save(window: AvailabilityWindow): Promise<void> {
    this.saved.push(window);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildCommand(): DefineAvailabilityWindowCommand {
  const startTime = new Date(Date.now() + 60 * 60_000);
  return new DefineAvailabilityWindowCommand({
    doctorId: '11111111-1111-4111-8111-111111111111',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    consultationType: ConsultationType.Paid,
  });
}

describe('DefineAvailabilityWindowUseCase', () => {
  it('defines a window for an existing doctor profile', async () => {
    const windowRepo = new FakeAvailabilityWindowRepository();
    const useCase = new DefineAvailabilityWindowUseCase(
      new FakeDoctorProfileRepository({} as DoctorProfile),
      windowRepo,
      new NoopDispatcher(),
    );

    const window = await useCase.execute(buildCommand());

    assert.equal(window.getDoctorId(), '11111111-1111-4111-8111-111111111111');
    assert.equal(windowRepo.saved.length, 1);
  });

  it('throws NotFoundError when the doctor profile does not exist', async () => {
    const useCase = new DefineAvailabilityWindowUseCase(
      new FakeDoctorProfileRepository(null),
      new FakeAvailabilityWindowRepository(),
      new NoopDispatcher(),
    );

    await assert.rejects(() => useCase.execute(buildCommand()), NotFoundError);
  });

  it('throws DoctorDomainError when the window overlaps an existing one', async () => {
    const existing = AvailabilityWindow.define({
      doctorId: '11111111-1111-4111-8111-111111111111',
      startTime: new Date(Date.now() + 60 * 60_000),
      endTime: new Date(Date.now() + 90 * 60_000),
      consultationType: ConsultationType.Free,
    });
    const useCase = new DefineAvailabilityWindowUseCase(
      new FakeDoctorProfileRepository({} as DoctorProfile),
      new FakeAvailabilityWindowRepository([existing]),
      new NoopDispatcher(),
    );

    await assert.rejects(() => useCase.execute(buildCommand()), DoctorDomainError);
  });
});
