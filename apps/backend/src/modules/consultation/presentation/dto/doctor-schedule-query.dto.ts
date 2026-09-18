import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';

// GET /appointments/doctor/schedule?from=&to=&status=. No existing
// precedent on DoctorAppointmentsController for a caller-supplied date
// range (every other route computes its own internal date bounds), so this
// is new validation code -- follows BookAppointmentRequestDto's general
// class-validator decorator style.
export class DoctorScheduleQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  // Phase 0 (Doctor Reports page rebuild): the DTO contract for Phase 2's
  // reports-tile drill-down into Schedule -- filtering itself is wired up
  // there, not in this phase.
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
