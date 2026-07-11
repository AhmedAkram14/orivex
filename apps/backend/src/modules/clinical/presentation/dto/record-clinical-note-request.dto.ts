import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Matches docs/12-openapi.md's createClinicalNote request body.
// authoringDoctorId is an additive field -- Authentication isn't built yet
// (mirrors Doctor/Consultation's established precedent). derivedFromSuggestionId
// is accepted for contract compatibility but intentionally discarded --
// AIModule doesn't exist yet.
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
