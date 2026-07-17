import type { ScheduleExceptionType } from '../../../domain/enums/schedule-exception-type.enum.js';

export class AddScheduleExceptionCommand {
  readonly doctorId: string;
  readonly date: string;
  readonly type: ScheduleExceptionType;
  readonly hours?: { start: string; end: string };
  readonly reason?: string;

  constructor(props: {
    doctorId: string;
    date: string;
    type: ScheduleExceptionType;
    hours?: { start: string; end: string };
    reason?: string;
  }) {
    this.doctorId = props.doctorId;
    this.date = props.date;
    this.type = props.type;
    this.hours = props.hours;
    this.reason = props.reason;
  }
}
