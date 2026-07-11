import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ReserveAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { AvailabilityWindowStatus } from '../../../../doctor/domain/enums/availability-window-status.enum.js';
import { ConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';

import { ReserveSlotCommand } from './reserve-slot.command.js';
import { ReserveSlotUseCase } from './reserve-slot.use-case.js';

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  constructor(private readonly window: AvailabilityWindow) {}
  async findById(): Promise<AvailabilityWindow | null> {
    return this.window;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

describe('ReserveSlotUseCase', () => {
  it('delegates to DoctorModule\'s exported ReserveAvailabilityWindowUseCase', async () => {
    const startTime = new Date(Date.now() + 60 * 60_000);
    const window = AvailabilityWindow.define({
      doctorId: '11111111-1111-4111-8111-111111111111',
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60_000),
      consultationType: ConsultationType.Paid,
    });
    const reserveAvailabilityWindowUseCase = new ReserveAvailabilityWindowUseCase(
      new FakeAvailabilityWindowRepository(window),
      new NoopDispatcher(),
    );
    const useCase = new ReserveSlotUseCase(reserveAvailabilityWindowUseCase);

    const result = await useCase.execute(new ReserveSlotCommand({ availabilityWindowId: window.getId() }));

    assert.equal(result.getStatus(), AvailabilityWindowStatus.Held);
  });
});
