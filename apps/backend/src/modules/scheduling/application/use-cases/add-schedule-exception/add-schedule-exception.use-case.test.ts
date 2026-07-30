import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ScheduleException } from '../../../domain/entities/schedule-exception.entity.js';
import { ScheduleExceptionType } from '../../../domain/enums/schedule-exception-type.enum.js';
import { SchedulingDomainError } from '../../../domain/exceptions/scheduling-domain.error.js';
import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';

import { AddScheduleExceptionCommand } from './add-schedule-exception.command.js';
import { AddScheduleExceptionUseCase } from './add-schedule-exception.use-case.js';

class FakeScheduleExceptionRepository implements ScheduleExceptionRepository {
  public saved: ScheduleException[] = [];
  async findById(id: string): Promise<ScheduleException | null> {
    return this.saved.find((item) => item.getId() === id) ?? null;
  }
  async findByDoctorId(doctorId: string): Promise<ScheduleException[]> {
    return this.saved.filter((item) => item.getDoctorId() === doctorId);
  }
  async findByDoctorIdsAndDates(): Promise<ScheduleException[]> {
    return [];
  }
  async save(exception: ScheduleException): Promise<void> {
    this.saved.push(exception);
  }
  async deleteById(): Promise<void> {}
}

describe('AddScheduleExceptionUseCase', () => {
  it('creates and persists a vacation exception for the doctor', async () => {
    const repository = new FakeScheduleExceptionRepository();
    const useCase = new AddScheduleExceptionUseCase(repository);

    const result = await useCase.execute(
      new AddScheduleExceptionCommand({ doctorId: 'doctor-1', date: '2026-08-01', type: ScheduleExceptionType.Vacation }),
    );

    assert.equal(result.getDoctorId(), 'doctor-1');
    assert.equal(repository.saved.length, 1);
  });

  it('rejects an extra-hours exception with no hours', async () => {
    const useCase = new AddScheduleExceptionUseCase(new FakeScheduleExceptionRepository());

    await assert.rejects(
      () =>
        useCase.execute(
          new AddScheduleExceptionCommand({ doctorId: 'doctor-1', date: '2026-08-01', type: ScheduleExceptionType.ExtraHours }),
        ),
      SchedulingDomainError,
    );
  });
});
