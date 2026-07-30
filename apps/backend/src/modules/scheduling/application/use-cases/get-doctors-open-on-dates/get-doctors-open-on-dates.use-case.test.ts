import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Holiday } from '../../../domain/entities/holiday.entity.js';
import { ScheduleException } from '../../../domain/entities/schedule-exception.entity.js';
import { WorkingHoursDay } from '../../../domain/entities/working-hours-day.entity.js';
import { ScheduleExceptionType } from '../../../domain/enums/schedule-exception-type.enum.js';
import { WeekDay } from '../../../domain/enums/week-day.enum.js';
import type { HolidayRepository } from '../../../domain/repositories/holiday.repository.js';
import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';
import type { WorkingHoursRepository } from '../../../domain/repositories/working-hours.repository.js';

import { GetDoctorsOpenOnDatesUseCase } from './get-doctors-open-on-dates.use-case.js';

// 2026-08-03 is a Monday, 2026-08-04 is a Tuesday (UTC) -- fixed fixture
// dates so the weekday resolution in the use case under test is
// deterministic regardless of when the suite runs.
const MONDAY = '2026-08-03';
const TUESDAY = '2026-08-04';

function workingDay(doctorId: string, dayOfWeek: WeekDay, isWorkingDay: boolean): WorkingHoursDay {
  return WorkingHoursDay.create('id', {
    doctorId,
    dayOfWeek,
    isWorkingDay,
    hours: { start: '09:00', end: '17:00' },
    breaks: [],
  });
}

class FakeWorkingHoursRepository implements Partial<WorkingHoursRepository> {
  constructor(private readonly byDoctorId: Map<string, WorkingHoursDay[]>) {}
  async findByDoctorIds(): Promise<Map<string, WorkingHoursDay[]>> {
    return this.byDoctorId;
  }
}

class FakeScheduleExceptionRepository implements Partial<ScheduleExceptionRepository> {
  constructor(private readonly exceptions: ScheduleException[] = []) {}
  async findByDoctorIdsAndDates(): Promise<ScheduleException[]> {
    return this.exceptions;
  }
}

class FakeHolidayRepository implements Partial<HolidayRepository> {
  constructor(private readonly holidays: Holiday[] = []) {}
  async findAll(): Promise<Holiday[]> {
    return this.holidays;
  }
}

function buildUseCase(
  workingHours: Map<string, WorkingHoursDay[]>,
  exceptions: ScheduleException[] = [],
  holidays: Holiday[] = [],
): GetDoctorsOpenOnDatesUseCase {
  return new GetDoctorsOpenOnDatesUseCase(
    new FakeWorkingHoursRepository(workingHours) as unknown as WorkingHoursRepository,
    new FakeScheduleExceptionRepository(exceptions) as unknown as ScheduleExceptionRepository,
    new FakeHolidayRepository(holidays) as unknown as HolidayRepository,
  );
}

describe('GetDoctorsOpenOnDatesUseCase', () => {
  it('is open on a date whose weekday the doctor has configured as a working day', async () => {
    const useCase = buildUseCase(new Map([['doctor-1', [workingDay('doctor-1', WeekDay.Monday, true)]]]));

    const result = await useCase.execute({ doctorIds: ['doctor-1'], dates: [MONDAY] });

    assert.equal(result.get('doctor-1')?.has(MONDAY), true);
  });

  it('is not open on a date whose weekday the doctor has configured as a non-working day', async () => {
    const useCase = buildUseCase(new Map([['doctor-1', [workingDay('doctor-1', WeekDay.Tuesday, false)]]]));

    const result = await useCase.execute({ doctorIds: ['doctor-1'], dates: [TUESDAY] });

    assert.equal(result.has('doctor-1'), false);
  });

  it('a vacation exception closes an otherwise-working day', async () => {
    const exception = ScheduleException.create({ doctorId: 'doctor-1', date: MONDAY, type: ScheduleExceptionType.Vacation });
    const useCase = buildUseCase(new Map([['doctor-1', [workingDay('doctor-1', WeekDay.Monday, true)]]]), [exception]);

    const result = await useCase.execute({ doctorIds: ['doctor-1'], dates: [MONDAY] });

    assert.equal(result.has('doctor-1'), false);
  });

  it('an extra-hours exception opens an otherwise non-working day', async () => {
    const exception = ScheduleException.create({
      doctorId: 'doctor-1',
      date: TUESDAY,
      type: ScheduleExceptionType.ExtraHours,
      hours: { start: '10:00', end: '12:00' },
    });
    const useCase = buildUseCase(new Map([['doctor-1', [workingDay('doctor-1', WeekDay.Tuesday, false)]]]), [exception]);

    const result = await useCase.execute({ doctorIds: ['doctor-1'], dates: [TUESDAY] });

    assert.equal(result.get('doctor-1')?.has(TUESDAY), true);
  });

  it('a global holiday closes the day regardless of the doctor\'s own schedule', async () => {
    const holiday = Holiday.reconstitute({ id: 'holiday-1', date: MONDAY, name: 'National Day' });
    const useCase = buildUseCase(new Map([['doctor-1', [workingDay('doctor-1', WeekDay.Monday, true)]]]), [], [holiday]);

    const result = await useCase.execute({ doctorIds: ['doctor-1'], dates: [MONDAY] });

    assert.equal(result.has('doctor-1'), false);
  });

  it('returns an empty map entirely for doctors with no open dates in the requested range', async () => {
    const useCase = buildUseCase(new Map());

    const result = await useCase.execute({ doctorIds: ['doctor-1'], dates: [MONDAY, TUESDAY] });

    assert.equal(result.size, 0);
  });
});
