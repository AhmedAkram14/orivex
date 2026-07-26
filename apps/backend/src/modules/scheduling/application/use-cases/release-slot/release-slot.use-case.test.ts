import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ReleaseAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { AvailabilityWindowStatus } from '../../../../doctor/domain/enums/availability-window-status.enum.js';
import { ConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';

import { ReleaseSlotCommand } from './release-slot.command.js';
import { ReleaseSlotUseCase } from './release-slot.use-case.js';

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  constructor(private readonly window: AvailabilityWindow) {}
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
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

describe('ReleaseSlotUseCase', () => {
  it('delegates to DoctorModule\'s exported ReleaseAvailabilityWindowUseCase', async () => {
    const startTime = new Date(Date.now() + 60 * 60_000);
    const window = AvailabilityWindow.define({
      doctorId: '11111111-1111-4111-8111-111111111111',
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60_000),
      consultationType: ConsultationType.Free,
    });
    window.hold();
    const releaseAvailabilityWindowUseCase = new ReleaseAvailabilityWindowUseCase(
      new FakeAvailabilityWindowRepository(window),
      new NoopDispatcher(),
    );
    const useCase = new ReleaseSlotUseCase(releaseAvailabilityWindowUseCase);

    const result = await useCase.execute(new ReleaseSlotCommand({ availabilityWindowId: window.getId() }));

    assert.equal(result.getStatus(), AvailabilityWindowStatus.Open);
  });
});
