import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DefineAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/define-availability-window/define-availability-window.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { ListAvailabilityWindowsForDoctorUseCase } from '../../../../doctor/application/use-cases/list-availability-windows-for-doctor/list-availability-windows-for-doctor.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import { AvailabilityWindowStatus } from '../../../../doctor/domain/enums/availability-window-status.enum.js';
import { ConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { Holiday } from '../../../domain/entities/holiday.entity.js';
import type { ScheduleException } from '../../../domain/entities/schedule-exception.entity.js';
import { WorkingHoursDay } from '../../../domain/entities/working-hours-day.entity.js';
import { WeekDay } from '../../../domain/enums/week-day.enum.js';
import type { HolidayRepository } from '../../../domain/repositories/holiday.repository.js';
import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';
import type { WorkingHoursRepository } from '../../../domain/repositories/working-hours.repository.js';
import { generateCandidateSlotsForDate, resolveEffectiveDay } from '../../services/generate-bookable-slots.js';
import { GetDoctorWorkingHoursUseCase } from '../get-doctor-working-hours/get-doctor-working-hours.use-case.js';
import { GetSchedulingRulesUseCase } from '../get-scheduling-rules/get-scheduling-rules.use-case.js';
import { ListHolidaysUseCase } from '../list-holidays/list-holidays.use-case.js';
import { ListScheduleExceptionsForDoctorUseCase } from '../list-schedule-exceptions-for-doctor/list-schedule-exceptions-for-doctor.use-case.js';

import { GetBookableAvailabilityQuery } from './get-bookable-availability.query.js';
import { GetBookableAvailabilityUseCase } from './get-bookable-availability.use-case.js';

const DOCTOR_ID = '11111111-1111-4111-8111-111111111111';

class NoopDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

class FakeWorkingHoursRepository implements WorkingHoursRepository {
  constructor(private readonly days: WorkingHoursDay[] = []) {}
  async findByDoctorId(): Promise<WorkingHoursDay[]> {
    return this.days;
  }
  async findByDoctorIds(): Promise<Map<string, WorkingHoursDay[]>> {
    return new Map();
  }
  async replaceAllForDoctor(): Promise<WorkingHoursDay[]> {
    return this.days;
  }
}

class FakeScheduleExceptionRepository implements ScheduleExceptionRepository {
  async findById(): Promise<null> {
    return null;
  }
  async findByDoctorId(): Promise<[]> {
    return [];
  }
  async findByDoctorIdsAndDates(): Promise<ScheduleException[]> {
    return [];
  }
  async save(): Promise<void> {}
  async deleteById(): Promise<void> {}
}

class FakeHolidayRepository implements HolidayRepository {
  async findAll(): Promise<Holiday[]> {
    return [];
  }
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  private readonly byId = new Map<string, AvailabilityWindow>();
  async findById(id: string): Promise<AvailabilityWindow | null> {
    return this.byId.get(id) ?? null;
  }
  async findOverlapping(doctorId: string, startTime: Date, endTime: Date): Promise<AvailabilityWindow[]> {
    return Array.from(this.byId.values()).filter(
      (w) => w.getDoctorId() === doctorId && w.getStartTime() < endTime && w.getEndTime() > startTime,
    );
  }
  async findByDoctorAndRange(doctorId: string, from: Date, to: Date): Promise<AvailabilityWindow[]> {
    return Array.from(this.byId.values()).filter(
      (w) => w.getDoctorId() === doctorId && w.getStartTime() >= from && w.getStartTime() < to,
    );
  }
  async save(window: AvailabilityWindow): Promise<void> {
    this.byId.set(window.getId(), window);
  }
  seed(window: AvailabilityWindow): void {
    this.byId.set(window.getId(), window);
  }
}

const ALL_WEEK_DAYS: WeekDay[] = [
  WeekDay.Sunday,
  WeekDay.Monday,
  WeekDay.Tuesday,
  WeekDay.Wednesday,
  WeekDay.Thursday,
  WeekDay.Friday,
  WeekDay.Saturday,
];

function buildWorkingDay(overrides: Partial<Parameters<typeof WorkingHoursDay.create>[1]> = {}): WorkingHoursDay {
  return WorkingHoursDay.create('day-1', {
    doctorId: DOCTOR_ID,
    dayOfWeek: WeekDay.Monday,
    isWorkingDay: true,
    hours: { start: '09:00', end: '10:00' },
    breaks: [],
    ...overrides,
  });
}

// GetDoctorWorkingHoursUseCase assumes the repository returns either 0 or a
// full 7-day set (UpdateDoctorWorkingHoursUseCase's own "replace-all-7"
// invariant) -- a fake seeding only Monday would silently produce
// `undefined` for the other 6 days.
function buildFullWeek(monday: WorkingHoursDay): WorkingHoursDay[] {
  return ALL_WEEK_DAYS.map((dayOfWeek) =>
    dayOfWeek === WeekDay.Monday
      ? monday
      : WorkingHoursDay.create(`day-${dayOfWeek}`, {
          doctorId: DOCTOR_ID,
          dayOfWeek,
          isWorkingDay: false,
          hours: { start: '09:00', end: '17:00' },
          breaks: [],
        }),
  );
}

function buildDoctorProfile(consultationFeeAmount?: number): DoctorProfile {
  return DoctorProfile.register({
    accountId: 'account-1',
    licenseNumber: 'LIC-1',
    specialtyId: '11111111-1111-4111-8111-111111111111',
    consultationFeeAmount,
  });
}

function buildUseCase(props: {
  workingDays?: WorkingHoursDay[];
  doctorProfile?: DoctorProfile | null;
  availabilityWindowRepo?: FakeAvailabilityWindowRepository;
}) {
  const availabilityWindowRepo = props.availabilityWindowRepo ?? new FakeAvailabilityWindowRepository();
  const doctorProfileRepo = new FakeDoctorProfileRepository(
    props.doctorProfile === undefined ? buildDoctorProfile() : props.doctorProfile,
  );

  return new GetBookableAvailabilityUseCase(
    new GetDoctorWorkingHoursUseCase(new FakeWorkingHoursRepository(props.workingDays ?? buildFullWeek(buildWorkingDay()))),
    new ListScheduleExceptionsForDoctorUseCase(new FakeScheduleExceptionRepository()),
    new ListHolidaysUseCase(new FakeHolidayRepository()),
    new GetSchedulingRulesUseCase(),
    new GetDoctorProfileByIdUseCase(doctorProfileRepo),
    new ListAvailabilityWindowsForDoctorUseCase(availabilityWindowRepo),
    new DefineAvailabilityWindowUseCase(doctorProfileRepo, availabilityWindowRepo, new NoopDispatcher()),
  );
}

// A Monday far enough in the future that the default 60-minute minimum
// notice / 30-day booking window never excludes it, whatever day this suite
// happens to run on.
function nextMonday(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + ((1 - date.getUTCDay() + 7) % 7 || 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

describe('GetBookableAvailabilityUseCase', () => {
  it('materializes new Open windows from the recurring working hours when none exist yet', async () => {
    const monday = nextMonday();
    const useCase = buildUseCase({});

    const result = await useCase.execute(
      new GetBookableAvailabilityQuery({ doctorId: DOCTOR_ID, from: monday, to: new Date(monday.getTime() + 86_400_000) }),
    );

    // Cross-checked against the same pure slot-generation function directly
    // (not a hardcoded count) so this doesn't silently drift if the real,
    // shared SchedulingRules ever change.
    const rules = await new GetSchedulingRulesUseCase().execute();
    const effectiveDay = resolveEffectiveDay(monday, [buildWorkingDay()], [], []);
    const expected = generateCandidateSlotsForDate(monday, effectiveDay, rules, new Date());

    assert.equal(result.length, expected.length);
    assert.ok(result.length > 0);
    assert.ok(result.every((w) => w.getStatus() === AvailabilityWindowStatus.Open));
    assert.ok(result.every((w) => w.getDoctorId() === DOCTOR_ID));
  });

  it('derives Paid consultationType from a set consultationFeeAmount, Free otherwise', async () => {
    const monday = nextMonday();
    const range = { from: monday, to: new Date(monday.getTime() + 86_400_000) };

    const freeResult = await buildUseCase({ doctorProfile: buildDoctorProfile(undefined) }).execute(
      new GetBookableAvailabilityQuery({ doctorId: DOCTOR_ID, ...range }),
    );
    assert.ok(freeResult.every((w) => w.getConsultationType() === ConsultationType.Free));

    const paidResult = await buildUseCase({ doctorProfile: buildDoctorProfile(500) }).execute(
      new GetBookableAvailabilityQuery({ doctorId: DOCTOR_ID, ...range }),
    );
    assert.ok(paidResult.every((w) => w.getConsultationType() === ConsultationType.Paid));
  });

  // A working window shrunk to exactly one 30-minute slot (09:00-09:30) --
  // makes these tests' exact-count assertions robust to whatever the real,
  // shared SchedulingRules' bufferMinutes happens to be.
  const singleSlotWorkingDays = buildFullWeek(buildWorkingDay({ hours: { start: '09:00', end: '09:30' } }));

  it('reuses an already-materialized Open window instead of creating a duplicate', async () => {
    const monday = nextMonday();
    const repo = new FakeAvailabilityWindowRepository();
    const existing = AvailabilityWindow.define({
      doctorId: DOCTOR_ID,
      startTime: new Date(monday.getTime() + 9 * 60 * 60_000),
      endTime: new Date(monday.getTime() + 9.5 * 60 * 60_000),
      consultationType: ConsultationType.Free,
    });
    repo.seed(existing);

    const useCase = buildUseCase({ availabilityWindowRepo: repo, workingDays: singleSlotWorkingDays });
    const result = await useCase.execute(
      new GetBookableAvailabilityQuery({ doctorId: DOCTOR_ID, from: monday, to: new Date(monday.getTime() + 86_400_000) }),
    );

    assert.equal(result.length, 1);
    assert.ok(result.some((w) => w.getId() === existing.getId()));
  });

  it('excludes a window that is already Booked', async () => {
    const monday = nextMonday();
    const repo = new FakeAvailabilityWindowRepository();
    const booked = AvailabilityWindow.define({
      doctorId: DOCTOR_ID,
      startTime: new Date(monday.getTime() + 9 * 60 * 60_000),
      endTime: new Date(monday.getTime() + 9.5 * 60 * 60_000),
      consultationType: ConsultationType.Free,
    });
    booked.hold();
    booked.confirm();
    repo.seed(booked);

    const useCase = buildUseCase({ availabilityWindowRepo: repo, workingDays: singleSlotWorkingDays });
    const result = await useCase.execute(
      new GetBookableAvailabilityQuery({ doctorId: DOCTOR_ID, from: monday, to: new Date(monday.getTime() + 86_400_000) }),
    );

    assert.equal(result.length, 0);
    assert.ok(result.every((w) => w.getId() !== booked.getId()));
  });

  it('includes a Held window whose hold has already lapsed', async () => {
    const monday = nextMonday();
    const repo = new FakeAvailabilityWindowRepository();
    const held = AvailabilityWindow.define({
      doctorId: DOCTOR_ID,
      startTime: new Date(monday.getTime() + 9 * 60 * 60_000),
      endTime: new Date(monday.getTime() + 9.5 * 60 * 60_000),
      consultationType: ConsultationType.Free,
    });
    held.hold(new Date(Date.now() - 60 * 60_000), 15); // held an hour ago, 15-minute hold -- long expired.
    repo.seed(held);

    const useCase = buildUseCase({ availabilityWindowRepo: repo, workingDays: singleSlotWorkingDays });
    const result = await useCase.execute(
      new GetBookableAvailabilityQuery({ doctorId: DOCTOR_ID, from: monday, to: new Date(monday.getTime() + 86_400_000) }),
    );

    assert.ok(result.some((w) => w.getId() === held.getId()));
  });

  it('returns nothing for a non-working day', async () => {
    const monday = nextMonday();
    const useCase = buildUseCase({ workingDays: buildFullWeek(buildWorkingDay({ isWorkingDay: false })) });

    const result = await useCase.execute(
      new GetBookableAvailabilityQuery({ doctorId: DOCTOR_ID, from: monday, to: new Date(monday.getTime() + 86_400_000) }),
    );

    assert.equal(result.length, 0);
  });
});
