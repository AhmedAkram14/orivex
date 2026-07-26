import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

import { BloodType } from '../../domain/enums/blood-type.enum.js';
import { EmergencyRelationship } from '../../domain/enums/emergency-relationship.enum.js';

class EmergencyContactRequestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(EmergencyRelationship)
  relationship!: EmergencyRelationship;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;
}

// Only the fields PatientModule actually owns -- fullName/email/phoneNumber/
// dateOfBirth/gender/nationality/address all belong to Account and are
// edited through the shared `PATCH /accounts/me/personal-profile` endpoint
// instead (Onboarding Redesign, 2026-07-21 proposal §0a).
export class UpdatePatientProfileRequestDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactRequestDto)
  emergencyContacts?: EmergencyContactRequestDto[];

  // Onboarding Redesign (2026-07-21 proposal, Stage O.3): deliberately plain
  // free text for allergies/chronicDiseases -- no ICD-11/SNOMED CT, no
  // reference tables, per the finalized product decision.
  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chronicDiseases?: string;

  @IsOptional()
  @IsUUID('4')
  insuranceProviderId?: string;
}
