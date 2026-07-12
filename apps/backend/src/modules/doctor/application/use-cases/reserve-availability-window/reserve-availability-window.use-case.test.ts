import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import { AvailabilityWindowStatus } from '../../../domain/enums/availability-window-status.enum.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import { AvailabilityWindowConflictError } from '../../../domain/exceptions/availability-window-conflict.error.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import { ReserveAvailabilityWindowCommand } from './reserve-availability-window.command.js';
import { ReserveAvailabilityWindowUseCase } from './reserve-availability-window.use-case.js';

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

  subscribe(): void {}
}

function buildOpenWindow(): AvailabilityWindow {
  const startTime = new Date(Date.now() + 60 * 60_000);
  return AvailabilityWindow.define({
    doctorId: '11111111-1111-4111-8111-111111111111',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    consultationType: ConsultationType.Paid,
  });
}

describe('ReserveAvailabilityWindowUseCase', () => {
  it('holds an Open window', async () => {
    const window = buildOpenWindow();
    const repo = new FakeAvailabilityWindowRepository(window);
    const useCase = new ReserveAvailabilityWindowUseCase(repo, new NoopDispatcher());

    const result = await useCase.execute(new ReserveAvailabilityWindowCommand({ availabilityWindowId: window.getId() }));

    assert.equal(result.getStatus(), AvailabilityWindowStatus.Held);
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the window does not exist', async () => {
    const repo = new FakeAvailabilityWindowRepository(null);
    const useCase = new ReserveAvailabilityWindowUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new ReserveAvailabilityWindowCommand({ availabilityWindowId: 'missing-id' })),
      NotFoundError,
    );
  });

  it('propagates the domain error when the window is already held', async () => {
    const window = buildOpenWindow();
    window.hold();
    const repo = new FakeAvailabilityWindowRepository(window);
    const useCase = new ReserveAvailabilityWindowUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new ReserveAvailabilityWindowCommand({ availabilityWindowId: window.getId() })),
      AvailabilityWindowConflictError,
    );
  });
});
