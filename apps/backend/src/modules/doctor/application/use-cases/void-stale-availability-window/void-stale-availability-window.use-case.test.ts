import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import { AvailabilityWindowConflictError } from '../../../domain/exceptions/availability-window-conflict.error.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';
import { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';

import { VoidStaleAvailabilityWindowCommand } from './void-stale-availability-window.command.js';
import { VoidStaleAvailabilityWindowUseCase } from './void-stale-availability-window.use-case.js';

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  public readonly deletedIds: string[] = [];
  constructor(private readonly window: AvailabilityWindow | null) {}
  async findById(): Promise<AvailabilityWindow | null> {
    return this.window;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async findByDoctorAndRange(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(): Promise<void> {}
  async deleteById(id: string): Promise<void> {
    this.deletedIds.push(id);
  }
}

function buildOpenWindow(): AvailabilityWindow {
  const startTime = new Date(Date.now() + 60 * 60_000);
  return AvailabilityWindow.define({
    doctorId: '11111111-1111-4111-8111-111111111111',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    pricing: ConsultationPricing.free(),
  });
}

describe('VoidStaleAvailabilityWindowUseCase', () => {
  it('deletes a genuinely Open window', async () => {
    const window = buildOpenWindow();
    const repo = new FakeAvailabilityWindowRepository(window);
    const useCase = new VoidStaleAvailabilityWindowUseCase(repo);

    await useCase.execute(new VoidStaleAvailabilityWindowCommand({ availabilityWindowId: window.getId() }));

    assert.deepEqual(repo.deletedIds, [window.getId()]);
  });

  it('is a no-op success when the window is already gone', async () => {
    const repo = new FakeAvailabilityWindowRepository(null);
    const useCase = new VoidStaleAvailabilityWindowUseCase(repo);

    await useCase.execute(new VoidStaleAvailabilityWindowCommand({ availabilityWindowId: 'missing-id' }));

    assert.deepEqual(repo.deletedIds, []);
  });

  it('refuses to void a Held window, re-checking status itself rather than trusting the caller', async () => {
    const window = buildOpenWindow();
    window.hold();
    const repo = new FakeAvailabilityWindowRepository(window);
    const useCase = new VoidStaleAvailabilityWindowUseCase(repo);

    await assert.rejects(
      () => useCase.execute(new VoidStaleAvailabilityWindowCommand({ availabilityWindowId: window.getId() })),
      AvailabilityWindowConflictError,
    );
    assert.deepEqual(repo.deletedIds, []);
  });

  it('refuses to void a Booked window', async () => {
    const window = buildOpenWindow();
    window.hold();
    window.confirm();
    const repo = new FakeAvailabilityWindowRepository(window);
    const useCase = new VoidStaleAvailabilityWindowUseCase(repo);

    await assert.rejects(
      () => useCase.execute(new VoidStaleAvailabilityWindowCommand({ availabilityWindowId: window.getId() })),
      AvailabilityWindowConflictError,
    );
    assert.deepEqual(repo.deletedIds, []);
  });
});
