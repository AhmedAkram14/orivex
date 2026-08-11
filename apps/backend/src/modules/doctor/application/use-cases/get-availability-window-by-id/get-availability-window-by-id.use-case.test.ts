import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';
import { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';

import { GetAvailabilityWindowByIdUseCase } from './get-availability-window-by-id.use-case.js';

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
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
}

describe('GetAvailabilityWindowByIdUseCase', () => {
  it('returns the window when it exists', async () => {
    const startTime = new Date(Date.now() + 60 * 60_000);
    const window = AvailabilityWindow.define({
      doctorId: '11111111-1111-4111-8111-111111111111',
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60_000),
      pricing: ConsultationPricing.free(),
    });
    const useCase = new GetAvailabilityWindowByIdUseCase(new FakeAvailabilityWindowRepository(window));

    const result = await useCase.execute({ availabilityWindowId: window.getId() });

    assert.equal(result?.getId(), window.getId());
  });

  it('returns null (not a thrown error) when the window does not exist', async () => {
    const useCase = new GetAvailabilityWindowByIdUseCase(new FakeAvailabilityWindowRepository(null));

    const result = await useCase.execute({ availabilityWindowId: '22222222-2222-4222-8222-222222222222' });

    assert.equal(result, null);
  });
});
