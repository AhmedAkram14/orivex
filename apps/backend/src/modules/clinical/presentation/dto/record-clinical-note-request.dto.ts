import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// I5 -- SOAP-structured clinical notes (docs/01-prd.md inventory: "SOAP
// structure 🟢" core). Replaces the single free-text `content` field with
// the four discrete SOAP sections -- minus authoringDoctorId, which the
// controller derives from the authenticated caller's JWT (CurrentUser), so
// a doctor can only ever author a note as themselves; the application
// layer separately enforces that the resolved doctor is the consultation's
// treating doctor. derivedFromSuggestionId is accepted for contract
// compatibility but intentionally discarded -- no use case or entity in
// this module persists a link between a clinical note and the AI
// suggestion (if any) it was derived from yet.
export class RecordClinicalNoteRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  subjective!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  objective!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  assessment!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  plan!: string;

  @IsOptional()
  @IsUUID()
  addendumOfNoteId?: string;

  @IsOptional()
  @IsUUID()
  derivedFromSuggestionId?: string;
}
