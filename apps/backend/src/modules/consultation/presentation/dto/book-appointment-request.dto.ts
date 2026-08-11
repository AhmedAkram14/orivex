import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Matches docs/12-openapi.md's BookAppointment request body, minus patientId
// -- the controller derives it from the authenticated caller's JWT
// (CurrentUser), so a patient can only ever book an appointment for
// themselves. linkedJourneyId is accepted for contract compatibility but
// intentionally discarded -- Health Journey doesn't exist yet (architect
// direction: no opaque id fields for future modules).
//
// Consultation Pricing Redesign: no longer accepts a client-supplied
// consultationType -- pricing (and Free/Paid) is inherent to the
// AvailabilityWindow being booked, never asserted by the client.
export class BookAppointmentRequestDto {
  @IsUUID()
  doctorId!: string;

  @IsUUID()
  availabilityWindowId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonForVisit?: string;

  @IsOptional()
  @IsUUID()
  linkedJourneyId?: string;
}
