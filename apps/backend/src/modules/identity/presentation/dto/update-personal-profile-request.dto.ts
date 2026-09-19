import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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

  // phoneNumber gap fix (Doctor Settings Rebuild, Phase 0 Part C): reuses
  // the exact validator shape this codebase already uses for a phone number
  // field (EmergencyContactRequestDto.phoneNumber, in
  // patient/presentation/dto/update-patient-profile-request.dto.ts) --
  // grepped the whole backend for `@IsPhoneNumber`/a phone regex and found
  // none anywhere; plain @IsString/@IsNotEmpty is this codebase's own
  // established convention for a phone number, not a new one invented here.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phoneNumber?: string;
}
