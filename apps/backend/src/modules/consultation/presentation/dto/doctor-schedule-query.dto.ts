import { IsISO8601 } from 'class-validator';

// GET /appointments/doctor/schedule?from=&to=. No existing precedent on
// DoctorAppointmentsController for a caller-supplied date range (every
// other route computes its own internal date bounds), so this is new
// validation code -- follows BookAppointmentRequestDto's general
// class-validator decorator style.
export class DoctorScheduleQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
