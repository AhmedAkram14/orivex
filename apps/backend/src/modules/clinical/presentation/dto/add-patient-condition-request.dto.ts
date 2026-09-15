import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CertaintyLevel } from '../../domain/enums/certainty-level.enum.js';

// Doctor Patient Chart plan, 4.1: a doctor-authored condition entry added
// directly from the patient chart's Medical History tab, outside any
// consultation session. Mirrors RecordDiagnosisRequestDto's decorator
// conventions exactly, minus `startJourney` -- a chart-added condition
// deliberately never starts a Health Journey (a session-flow concept this
// route has no business triggering).
export class AddPatientConditionRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  freeTextDescription!: string;

  @IsOptional()
  @IsEnum(CertaintyLevel)
  certaintyLevel?: CertaintyLevel;
}
