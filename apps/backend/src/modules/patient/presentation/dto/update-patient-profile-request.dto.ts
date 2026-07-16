import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

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

// Only the fields PatientModule actually owns -- fullName/email/phoneNumber
// belong to Account (IdentityModule doesn't yet expose an update-profile
// endpoint of its own), and address/gender have no backend storage
// anywhere. Editing those stays out of scope here rather than being faked.
export class UpdatePatientProfileRequestDto {
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactRequestDto)
  emergencyContacts?: EmergencyContactRequestDto[];
}
