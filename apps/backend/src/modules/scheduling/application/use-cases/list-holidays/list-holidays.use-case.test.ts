import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Holiday } from '../../../domain/entities/holiday.entity.js';
import type { HolidayRepository } from '../../../domain/repositories/holiday.repository.js';

import { ListHolidaysUseCase } from './list-holidays.use-case.js';

class FakeHolidayRepository implements HolidayRepository {
  constructor(private readonly items: Holiday[]) {}
  async findAll(): Promise<Holiday[]> {
    return this.items;
  }
}

describe('ListHolidaysUseCase', () => {
  it('returns all holidays', async () => {
    const holiday = Holiday.reconstitute({ id: 'holiday-1', date: '2026-01-07', name: 'Coptic Christmas Day' });
    const useCase = new ListHolidaysUseCase(new FakeHolidayRepository([holiday]));

    const result = await useCase.execute();

    assert.equal(result.length, 1);
    assert.equal(result[0].getName(), 'Coptic Christmas Day');
  });
});
