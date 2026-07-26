import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { Gender } from '../../domain/enums/gender.enum.js';

// Onboarding Redesign (2026-07-21 proposal, §0a/§14 Stage O.1): backs the
// shared "Personal Info" step both Patient and Doctor onboarding submit
// through -- one DTO, one endpoint, consumed by two different flows.
export class UpdatePersonalProfileRequestDto {
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsUUID('4')
  nationalityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
