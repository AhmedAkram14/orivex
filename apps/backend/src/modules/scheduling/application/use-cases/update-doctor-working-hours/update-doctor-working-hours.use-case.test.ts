import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WorkingHoursDay } from '../../../domain/entities/working-hours-day.entity.js';
import { WeekDay, ALL_WEEK_DAYS } from '../../../domain/enums/week-day.enum.js';
import { SchedulingDomainError } from '../../../domain/exceptions/scheduling-domain.error.js';
import type { WorkingHoursRepository } from '../../../domain/repositories/working-hours.repository.js';

import { UpdateDoctorWorkingHoursCommand, type WorkingHoursDayInput } from './update-doctor-working-hours.command.js';
import { UpdateDoctorWorkingHoursUseCase } from './update-doctor-working-hours.use-case.js';

class FakeWorkingHoursRepository implements WorkingHoursRepository {
  public lastReplacedDoctorId?: string;
  public lastReplacedDays?: WorkingHoursDay[];
  async findByDoctorId(): Promise<WorkingHoursDay[]> {
    return [];
  }
  async replaceAllForDoctor(doctorId: string, days: WorkingHoursDay[]): Promise<WorkingHoursDay[]> {
    this.lastReplacedDoctorId = doctorId;
    this.lastReplacedDays = days;
    return days;
  }
}

function fullWeek(overrides: Partial<Record<WeekDay, Partial<WorkingHoursDayInput>>> = {}): WorkingHoursDayInput[] {
  return ALL_WEEK_DAYS.map((dayOfWeek) => ({
    dayOfWeek,
    isWorkingDay: false,
    hours: { start: '09:00', end: '17:00' },
    breaks: [],
    ...overrides[dayOfWeek],
  }));
}

describe('UpdateDoctorWorkingHoursUseCase', () => {
  it('replaces all 7 days for the doctor', async () => {
    const repository = new FakeWorkingHoursRepository();
    const useCase = new UpdateDoctorWorkingHoursUseCase(repository);

    const result = await useCase.execute(
      new UpdateDoctorWorkingHoursCommand({
        doctorId: 'doctor-1',
        days: fullWeek({ [WeekDay.Monday]: { isWorkingDay: true, hours: { start: '08:00', end: '16:00' } } }),
      }),
    );

    assert.equal(result.length, 7);
    assert.equal(repository.lastReplacedDoctorId, 'doctor-1');
    assert.equal(repository.lastReplacedDays?.length, 7);
  });

  it('rejects fewer than 7 days', async () => {
    const useCase = new UpdateDoctorWorkingHoursUseCase(new FakeWorkingHoursRepository());
    const days = fullWeek().slice(0, 6);

    await assert.rejects(
      () => useCase.execute(new UpdateDoctorWorkingHoursCommand({ doctorId: 'doctor-1', days })),
      SchedulingDomainError,
    );
  });

  it('rejects an invalid hours range on a working day', async () => {
    const useCase = new UpdateDoctorWorkingHoursUseCase(new FakeWorkingHoursRepository());
    const days = fullWeek({ [WeekDay.Monday]: { isWorkingDay: true, hours: { start: '17:00', end: '08:00' } } });

    await assert.rejects(
      () => useCase.execute(new UpdateDoctorWorkingHoursCommand({ doctorId: 'doctor-1', days })),
      SchedulingDomainError,
    );
  });
});
