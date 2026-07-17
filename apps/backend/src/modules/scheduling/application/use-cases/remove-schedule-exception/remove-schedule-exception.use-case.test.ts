import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ScheduleException } from '../../../domain/entities/schedule-exception.entity.js';
import { ScheduleExceptionType } from '../../../domain/enums/schedule-exception-type.enum.js';
import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';

import { RemoveScheduleExceptionCommand } from './remove-schedule-exception.command.js';
import { RemoveScheduleExceptionUseCase } from './remove-schedule-exception.use-case.js';

class FakeScheduleExceptionRepository implements ScheduleExceptionRepository {
  public deletedIds: string[] = [];
  constructor(private readonly items: ScheduleException[]) {}
  async findById(id: string): Promise<ScheduleException | null> {
    return this.items.find((item) => item.getId() === id) ?? null;
  }
  async findByDoctorId(doctorId: string): Promise<ScheduleException[]> {
    return this.items.filter((item) => item.getDoctorId() === doctorId);
  }
  async save(): Promise<void> {}
  async deleteById(id: string): Promise<void> {
    this.deletedIds.push(id);
  }
}

describe('RemoveScheduleExceptionUseCase', () => {
  it('deletes an exception owned by the calling doctor', async () => {
    const exception = ScheduleException.create({ doctorId: 'doctor-1', date: '2026-08-01', type: ScheduleExceptionType.Vacation });
    const repository = new FakeScheduleExceptionRepository([exception]);
    const useCase = new RemoveScheduleExceptionUseCase(repository);

    const result = await useCase.execute(
      new RemoveScheduleExceptionCommand({ exceptionId: exception.getId(), doctorId: 'doctor-1' }),
    );

    assert.equal(result, true);
    assert.deepEqual(repository.deletedIds, [exception.getId()]);
  });

  it('returns false (not a thrown error) when the exception belongs to a different doctor', async () => {
    const exception = ScheduleException.create({ doctorId: 'doctor-1', date: '2026-08-01', type: ScheduleExceptionType.Vacation });
    const repository = new FakeScheduleExceptionRepository([exception]);
    const useCase = new RemoveScheduleExceptionUseCase(repository);

    const result = await useCase.execute(
      new RemoveScheduleExceptionCommand({ exceptionId: exception.getId(), doctorId: 'doctor-2' }),
    );

    assert.equal(result, false);
    assert.deepEqual(repository.deletedIds, []);
  });

  it('returns false when the exception does not exist', async () => {
    const useCase = new RemoveScheduleExceptionUseCase(new FakeScheduleExceptionRepository([]));

    const result = await useCase.execute(
      new RemoveScheduleExceptionCommand({ exceptionId: 'missing', doctorId: 'doctor-1' }),
    );

    assert.equal(result, false);
  });
});
