import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ScheduleException } from '../../../domain/entities/schedule-exception.entity.js';
import { ScheduleExceptionType } from '../../../domain/enums/schedule-exception-type.enum.js';
import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';

import { ListScheduleExceptionsForDoctorQuery } from './list-schedule-exceptions-for-doctor.query.js';
import { ListScheduleExceptionsForDoctorUseCase } from './list-schedule-exceptions-for-doctor.use-case.js';

class FakeScheduleExceptionRepository implements ScheduleExceptionRepository {
  constructor(private readonly items: ScheduleException[] = []) {}
  async findById(id: string): Promise<ScheduleException | null> {
    return this.items.find((item) => item.getId() === id) ?? null;
  }
  async findByDoctorId(doctorId: string): Promise<ScheduleException[]> {
    return this.items.filter((item) => item.getDoctorId() === doctorId);
  }
  async save(): Promise<void> {}
  async deleteById(): Promise<void> {}
}

describe('ListScheduleExceptionsForDoctorUseCase', () => {
  it("returns only the calling doctor's exceptions", async () => {
    const mine = ScheduleException.create({ doctorId: 'doctor-1', date: '2026-08-01', type: ScheduleExceptionType.Vacation });
    const theirs = ScheduleException.create({ doctorId: 'doctor-2', date: '2026-08-02', type: ScheduleExceptionType.Vacation });
    const useCase = new ListScheduleExceptionsForDoctorUseCase(new FakeScheduleExceptionRepository([mine, theirs]));

    const result = await useCase.execute(new ListScheduleExceptionsForDoctorQuery({ doctorId: 'doctor-1' }));

    assert.equal(result.length, 1);
    assert.equal(result[0].getId(), mine.getId());
  });
});
