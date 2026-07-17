import { randomUUID } from 'node:crypto';

import { ScheduleExceptionType } from '../enums/schedule-exception-type.enum.js';
import { SchedulingDomainError } from '../exceptions/scheduling-domain.error.js';

import type { TimeRangeProps } from './working-hours-day.entity.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface CreateScheduleExceptionProps {
  doctorId: string;
  date: string;
  type: ScheduleExceptionType;
  hours?: TimeRangeProps;
  reason?: string;
}

export interface ReconstituteScheduleExceptionProps {
  id: string;
  doctorId: string;
  date: string;
  type: ScheduleExceptionType;
  hours?: TimeRangeProps;
  reason?: string;
  createdAt: Date;
}

// One doctor's own one-off override of their recurring weekly schedule
// (vacation/unavailable/extra-hours) for a specific date. `hours` only
// applies to `extra-hours` -- matches the frontend's ScheduleException
// contract exactly (features/scheduling/types.ts).
export class ScheduleException {
  private constructor(
    private readonly id: string,
    private readonly doctorId: string,
    private readonly date: string,
    private readonly type: ScheduleExceptionType,
    private readonly hours: TimeRangeProps | undefined,
    private readonly reason: string | undefined,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreateScheduleExceptionProps): ScheduleException {
    if (!DATE_PATTERN.test(props.date)) {
      throw new SchedulingDomainError(`date must be an ISO date "YYYY-MM-DD" (got "${props.date}").`);
    }
    if (props.type === ScheduleExceptionType.ExtraHours && !props.hours) {
      throw new SchedulingDomainError('hours is required for an "extra-hours" exception.');
    }
    if (props.hours && props.hours.start >= props.hours.end) {
      throw new SchedulingDomainError(`hours start ("${props.hours.start}") must be before end ("${props.hours.end}").`);
    }

    return new ScheduleException(
      randomUUID(),
      props.doctorId,
      props.date,
      props.type,
      props.type === ScheduleExceptionType.ExtraHours ? props.hours : undefined,
      props.reason?.trim() || undefined,
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteScheduleExceptionProps): ScheduleException {
    return new ScheduleException(
      props.id,
      props.doctorId,
      props.date,
      props.type,
      props.hours,
      props.reason,
      props.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getDate(): string {
    return this.date;
  }

  getType(): ScheduleExceptionType {
    return this.type;
  }

  getHours(): TimeRangeProps | undefined {
    return this.hours;
  }

  getReason(): string | undefined {
    return this.reason;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
