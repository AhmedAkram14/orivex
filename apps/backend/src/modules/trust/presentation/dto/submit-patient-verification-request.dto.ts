import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

// Onboarding Redesign (2026-07-21 proposal, Stage O.2): mirrors
// SubmitDoctorVerificationRequestDto's shape minus licenseNumber/
// specialtyCode -- Patient identity verification needs only documents
// (National ID front/back, selfie), no professional-credential fields.
export class SubmitPatientVerificationRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  documentAssetIds!: string[];
}
