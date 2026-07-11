import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import { AvailabilityWindowStatus } from '../../../domain/enums/availability-window-status.enum.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import { DoctorDomainError } from '../../../domain/exceptions/doctor-domain.error.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import { ConfirmAvailabilityWindowCommand } from './confirm-availability-window.command.js';
import { ConfirmAvailabilityWindowUseCase } from './confirm-availability-window.use-case.js';

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  public readonly saved: AvailabilityWindow[] = [];
  constructor(private readonly window: AvailabilityWindow | null) {}
  async findById(): Promise<AvailabilityWindow | null> {
    return this.window;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(window: AvailabilityWindow): Promise<void> {
    this.saved.push(window);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}
}

function buildHeldWindow(): AvailabilityWindow {
  const startTime = new Date(Date.now() + 60 * 60_000);
  const window = AvailabilityWindow.define({
    doctorId: '11111111-1111-4111-8111-111111111111',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    consultationType: ConsultationType.Paid,
  });
  window.hold();
  return window;
}

describe('ConfirmAvailabilityWindowUseCase', () => {
  it('confirms a held window as Booked', async () => {
    const window = buildHeldWindow();
    const repo = new FakeAvailabilityWindowRepository(window);
    const useCase = new ConfirmAvailabilityWindowUseCase(repo, new NoopDispatcher());

    const result = await useCase.execute(new ConfirmAvailabilityWindowCommand({ availabilityWindowId: window.getId() }));

    assert.equal(result.getStatus(), AvailabilityWindowStatus.Booked);
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the window does not exist', async () => {
    const repo = new FakeAvailabilityWindowRepository(null);
    const useCase = new ConfirmAvailabilityWindowUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new ConfirmAvailabilityWindowCommand({ availabilityWindowId: 'missing-id' })),
      NotFoundError,
    );
  });

  it('propagates the domain error when the hold has expired', async () => {
    const startTime = new Date(Date.now() + 60 * 60_000);
    const window = AvailabilityWindow.define({
      doctorId: '11111111-1111-4111-8111-111111111111',
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60_000),
      consultationType: ConsultationType.Paid,
    });
    window.hold(new Date(Date.now() - 20 * 60_000), 15);
    const repo = new FakeAvailabilityWindowRepository(window);
    const useCase = new ConfirmAvailabilityWindowUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new ConfirmAvailabilityWindowCommand({ availabilityWindowId: window.getId() })),
      DoctorDomainError,
    );
  });
});
