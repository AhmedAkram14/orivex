import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Matches docs/12-openapi.md's createClinicalNote request body.
// authoringDoctorId is an additive field -- Authentication isn't built yet
// (mirrors Doctor/Consultation's established precedent). derivedFromSuggestionId
// is accepted for contract compatibility but intentionally discarded -- no
// use case or entity in this module persists a link between a clinical note
// and the AI suggestion (if any) it was derived from yet; wiring that
// traceability link is deferred, not blocked on AIModule (which now exists).
export class RecordClinicalNoteRequestDto {
  @IsUUID()
  authoringDoctorId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;

  @IsOptional()
  @IsUUID()
  addendumOfNoteId?: string;

  @IsOptional()
  @IsUUID()
  derivedFromSuggestionId?: string;
}
