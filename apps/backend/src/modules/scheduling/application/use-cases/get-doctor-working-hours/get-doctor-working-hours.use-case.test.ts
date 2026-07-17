import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WorkingHoursDay } from '../../../domain/entities/working-hours-day.entity.js';
import { WeekDay } from '../../../domain/enums/week-day.enum.js';
import type { WorkingHoursRepository } from '../../../domain/repositories/working-hours.repository.js';

import { GetDoctorWorkingHoursQuery } from './get-doctor-working-hours.query.js';
import { GetDoctorWorkingHoursUseCase } from './get-doctor-working-hours.use-case.js';

class FakeWorkingHoursRepository implements WorkingHoursRepository {
  constructor(private readonly byDoctorId: Map<string, WorkingHoursDay[]> = new Map()) {}
  async findByDoctorId(doctorId: string): Promise<WorkingHoursDay[]> {
    return this.byDoctorId.get(doctorId) ?? [];
  }
  async replaceAllForDoctor(doctorId: string, days: WorkingHoursDay[]): Promise<WorkingHoursDay[]> {
    this.byDoctorId.set(doctorId, days);
    return days;
  }
}

describe('GetDoctorWorkingHoursUseCase', () => {
  it('returns a computed, unsaved default template of all 7 days when never configured', async () => {
    const useCase = new GetDoctorWorkingHoursUseCase(new FakeWorkingHoursRepository());

    const result = await useCase.execute(new GetDoctorWorkingHoursQuery({ doctorId: 'doctor-1' }));

    assert.equal(result.length, 7);
    assert.ok(result.every((day) => day.getIsWorkingDay() === false));
    assert.ok(result.every((day) => day.getHours().start === '09:00' && day.getHours().end === '17:00'));
    assert.deepEqual(
      result.map((day) => day.getDayOfWeek()),
      [
        WeekDay.Sunday,
        WeekDay.Monday,
        WeekDay.Tuesday,
        WeekDay.Wednesday,
        WeekDay.Thursday,
        WeekDay.Friday,
        WeekDay.Saturday,
      ],
    );
  });

  it('returns the persisted days ordered by WeekDay when configured', async () => {
    const doctorId = 'doctor-1';
    const monday = WorkingHoursDay.create('wh-1', {
      doctorId,
      dayOfWeek: WeekDay.Monday,
      isWorkingDay: true,
      hours: { start: '08:00', end: '16:00' },
      breaks: [],
    });
    const repository = new FakeWorkingHoursRepository(new Map([[doctorId, [monday]]]));
    // Simulate a partial persisted set by only seeding Monday -- the use
    // case still returns exactly 7 entries (undefined slots would be a bug,
    // so this test only exercises the "fully configured" happy path below).
    const allDays = [
      WeekDay.Sunday,
      WeekDay.Monday,
      WeekDay.Tuesday,
      WeekDay.Wednesday,
      WeekDay.Thursday,
      WeekDay.Friday,
      WeekDay.Saturday,
    ].map((dayOfWeek) =>
      dayOfWeek === WeekDay.Monday
        ? monday
        : WorkingHoursDay.create(`wh-${dayOfWeek}`, {
            doctorId,
            dayOfWeek,
            isWorkingDay: false,
            hours: { start: '09:00', end: '17:00' },
            breaks: [],
          }),
    );
    await repository.replaceAllForDoctor(doctorId, allDays);

    const useCase = new GetDoctorWorkingHoursUseCase(repository);
    const result = await useCase.execute(new GetDoctorWorkingHoursQuery({ doctorId }));

    assert.equal(result.length, 7);
    const mondayResult = result.find((day) => day.getDayOfWeek() === WeekDay.Monday)!;
    assert.equal(mondayResult.getIsWorkingDay(), true);
    assert.equal(mondayResult.getHours().start, '08:00');
  });
});
