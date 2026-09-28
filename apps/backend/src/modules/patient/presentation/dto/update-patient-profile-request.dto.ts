import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

import { BloodType } from '../../domain/enums/blood-type.enum.js';
import { EmergencyRelationship } from '../../domain/enums/emergency-relationship.enum.js';
import { PatientAllergyStatus } from '../../domain/enums/patient-allergy-status.enum.js';

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

  // I6 -- Health Passport (docs/01.1-prd-update.md §17-30). Same free-text
  // convention as allergies/chronicDiseases above.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lifestyleNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nutritionNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  exerciseNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mentalHealthNotes?: string;

  // Patient-Reported Allergy Status (2026-09-28): the only value a client
  // may ever send here is NoneReported -- HasAllergies is derived
  // server-side from `allergies` text, and Unknown is a profile's untouched
  // default a client never asks to go back to. Rejected outright (422) if
  // `allergies` also holds real text in this same request, same as the
  // doctor-confirmation route's own rule.
  @IsOptional()
  @IsIn([PatientAllergyStatus.NoneReported])
  allergiesStatus?: PatientAllergyStatus.NoneReported;
}
