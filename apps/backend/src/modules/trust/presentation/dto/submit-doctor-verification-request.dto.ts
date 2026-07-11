import { ArrayMinSize, IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

// Matches docs/12-openapi.md's submitDoctorVerification request body exactly.
export class SubmitDoctorVerificationRequestDto {
  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @IsString()
  @IsNotEmpty()
  specialtyCode!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  documentAssetIds!: string[];
}
