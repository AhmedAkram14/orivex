import { SchedulingDomainError } from '../exceptions/scheduling-domain.error.js';
import type { WeekDay } from '../enums/week-day.enum.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface TimeRangeProps {
  start: string;
  end: string;
}

export interface CreateWorkingHoursDayProps {
  doctorId: string;
  dayOfWeek: WeekDay;
  isWorkingDay: boolean;
  hours: TimeRangeProps;
  breaks: TimeRangeProps[];
}

export interface ReconstituteWorkingHoursDayProps {
  id: string;
  doctorId: string;
  dayOfWeek: WeekDay;
  isWorkingDay: boolean;
  hours: TimeRangeProps;
  breaks: TimeRangeProps[];
  updatedAt: Date;
}

function assertValidTimeRange(range: TimeRangeProps): void {
  if (!TIME_PATTERN.test(range.start) || !TIME_PATTERN.test(range.end)) {
    throw new SchedulingDomainError(`Time range must use "HH:mm" (got "${range.start}"-"${range.end}").`);
  }
  if (range.start >= range.end) {
    throw new SchedulingDomainError(`Time range start ("${range.start}") must be before end ("${range.end}").`);
  }
}

// SchedulingModule's own aggregate: one doctor's recurring working-hours
// template for a single WeekDay -- always exactly 7 of these per doctor
// (enforced by UpdateDoctorWorkingHoursUseCase's full replace-all-7 upsert,
// not by this entity in isolation, since a lone WorkingHoursDay is a valid
// standalone value).
export class WorkingHoursDay {
  private constructor(
    private readonly id: string,
    private readonly doctorId: string,
    private readonly dayOfWeek: WeekDay,
    private isWorkingDay: boolean,
    private hours: TimeRangeProps,
    private breaks: TimeRangeProps[],
    private readonly updatedAt: Date,
  ) {}

  static create(id: string, props: CreateWorkingHoursDayProps): WorkingHoursDay {
    if (props.isWorkingDay) {
      assertValidTimeRange(props.hours);
      for (const brk of props.breaks) {
        assertValidTimeRange(brk);
      }
    }

    return new WorkingHoursDay(id, props.doctorId, props.dayOfWeek, props.isWorkingDay, props.hours, props.breaks, new Date());
  }

  static reconstitute(props: ReconstituteWorkingHoursDayProps): WorkingHoursDay {
    return new WorkingHoursDay(
      props.id,
      props.doctorId,
      props.dayOfWeek,
      props.isWorkingDay,
      props.hours,
      props.breaks,
      props.updatedAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getDayOfWeek(): WeekDay {
    return this.dayOfWeek;
  }

  getIsWorkingDay(): boolean {
    return this.isWorkingDay;
  }

  getHours(): TimeRangeProps {
    return this.hours;
  }

  getBreaks(): TimeRangeProps[] {
    return this.breaks;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
