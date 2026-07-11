import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

// Matches docs/12-openapi.md's BookAppointment request body. patientId is an
// additive field -- Authentication/session identity isn't built yet, so the
// caller is passed explicitly (mirrors DoctorModule's accountId precedent).
// linkedJourneyId is accepted for contract compatibility but intentionally
// discarded -- Health Journey doesn't exist yet (architect direction: no
// opaque id fields for future modules).
export class BookAppointmentRequestDto {
  @IsUUID()
  patientId!: string;

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
