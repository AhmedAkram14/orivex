import type { WeekDay } from '../../../domain/enums/week-day.enum.js';

export interface WorkingHoursDayInput {
  dayOfWeek: WeekDay;
  isWorkingDay: boolean;
  hours: { start: string; end: string };
  breaks: { start: string; end: string }[];
}

export class UpdateDoctorWorkingHoursCommand {
  readonly doctorId: string;
  // Always exactly 7 entries, one per WeekDay -- validated by the request
  // DTO (class-validator) and re-checked here (domain invariant, not just a
  // transport-layer one).
  readonly days: WorkingHoursDayInput[];

  constructor(props: { doctorId: string; days: WorkingHoursDayInput[] }) {
    this.doctorId = props.doctorId;
    this.days = props.days;
  }
}
