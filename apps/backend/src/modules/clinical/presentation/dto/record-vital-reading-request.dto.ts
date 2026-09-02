import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';

import { VitalType } from '../../domain/enums/vital-type.enum.js';

// Matches RecordVitalReadingCommand's own props minus patientId/doctorId --
// the controller derives patient/doctor from the consultation session (a
// doctor can only ever record vitals for their own treated patient),
// mirroring RecordDiagnosisRequestDto's exact precedent.
export class RecordVitalReadingRequestDto {
  @IsEnum(VitalType)
  type!: VitalType;

  @IsNumber()
  @IsPositive()
  value!: number;

  // Required only for VitalType.BloodPressure -- enforced by the domain
  // entity (VitalReading.create()), not re-validated here.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  diastolicValue?: number;
}
