import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { PrescriptionLineItemDto } from './prescription-line-item.dto.js';

// Matches docs/12-openapi.md's SignPrescription request body, minus
// authoringDoctorId -- the controller derives it from the authenticated
// caller's JWT (CurrentUser). derivedFromSuggestionId is accepted for
// contract compatibility but intentionally discarded -- no use case or
// entity in this module persists a link between a prescription and the AI
// suggestion (if any) it was derived from yet; wiring that traceability
// link is deferred, not blocked on AIModule (which now exists).
export class SignPrescriptionRequestDto {
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
