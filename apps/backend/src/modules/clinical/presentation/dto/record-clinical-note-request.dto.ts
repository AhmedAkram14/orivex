import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Matches docs/12-openapi.md's createClinicalNote request body, minus
// authoringDoctorId -- the controller derives it from the authenticated
// caller's JWT (CurrentUser), so a doctor can only ever author a note as
// themselves; the application layer separately enforces that the resolved
// doctor is the consultation's treating doctor. derivedFromSuggestionId is
// accepted for contract compatibility but intentionally discarded -- no use
// case or entity in this module persists a link between a clinical note and
// the AI suggestion (if any) it was derived from yet; wiring that
// traceability link is deferred, not blocked on AIModule (which now exists).
export class RecordClinicalNoteRequestDto {
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
