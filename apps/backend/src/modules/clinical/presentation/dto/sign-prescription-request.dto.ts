import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { PrescriptionLineItemDto } from './prescription-line-item.dto.js';

// Matches docs/12-openapi.md's SignPrescription request body. authoringDoctorId
// is an additive field -- Authentication isn't built yet (mirrors established
// precedent). derivedFromSuggestionId is accepted for contract compatibility
// but intentionally discarded -- AIModule doesn't exist yet.
export class SignPrescriptionRequestDto {
  @IsUUID()
  authoringDoctorId!: string;

  @IsUUID()
  consultationSessionId!: string;

  @IsUUID()
  diagnosisNodeId!: string;

  @IsOptional()
  @IsUUID()
  derivedFromSuggestionId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionLineItemDto)
  lineItems!: PrescriptionLineItemDto[];
}
