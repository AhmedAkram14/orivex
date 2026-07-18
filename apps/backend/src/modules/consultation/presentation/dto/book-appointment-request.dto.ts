import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

// Matches docs/12-openapi.md's BookAppointment request body, minus patientId
// -- the controller derives it from the authenticated caller's JWT
// (CurrentUser), so a patient can only ever book an appointment for
// themselves. linkedJourneyId is accepted for contract compatibility but
// intentionally discarded -- Health Journey doesn't exist yet (architect
// direction: no opaque id fields for future modules).
export class BookAppointmentRequestDto {
  @IsUUID()
  doctorId!: string;

  @IsUUID()
  availabilityWindowId!: string;

  @IsEnum(ConsultationType)
  consultationType!: ConsultationType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonForVisit?: string;

  @IsOptional()
  @IsUUID()
  linkedJourneyId?: string;
}
