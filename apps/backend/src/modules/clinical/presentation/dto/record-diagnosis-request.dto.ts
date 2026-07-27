import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CertaintyLevel } from '../../domain/enums/certainty-level.enum.js';

// Consultation lifecycle completion follow-up (2026-07-26): matches
// RecordDiagnosisUseCase's own props, minus patientId/doctorId/nodeType --
// the controller derives patient/doctor from the consultation session (a
// doctor can only ever diagnose their own treated patient), and this
// endpoint's nodeType is always Condition (see the use-case's own comment).
export class RecordDiagnosisRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  freeTextDescription!: string;

  @IsOptional()
  @IsEnum(CertaintyLevel)
  certaintyLevel?: CertaintyLevel;

  @IsOptional()
  @IsBoolean()
  startJourney?: boolean;
}
