import { IsIn, IsOptional, IsUUID } from 'class-validator';

import type { AppointmentAction } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.command.js';

const ACTIONS = ['reschedule', 'cancel'] as const;

// Matches docs/12-openapi.md's rescheduleOrCancelAppointment request body.
export class RescheduleOrCancelAppointmentRequestDto {
  @IsIn(ACTIONS)
  action!: AppointmentAction;

  @IsOptional()
  @IsUUID()
  newAvailabilityWindowId?: string;
}
