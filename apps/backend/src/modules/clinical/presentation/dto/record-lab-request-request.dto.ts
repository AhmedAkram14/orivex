import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// authoringDoctorId is deliberately absent -- the controller derives it from
// the authenticated caller's JWT (CurrentUser), matching
// SignPrescriptionRequestDto's own convention.
export class RecordLabRequestRequestDto {
  @IsUUID()
  consultationSessionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  testName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clinicalReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;
}
