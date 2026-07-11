import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

// Matches docs/12-openapi.md's PrescriptionLineItem schema exactly. Shared
// shape for both the SignPrescription request body and the
// PrescriptionSummary response.
export class PrescriptionLineItemDto {
  @IsUUID()
  drugCatalogId!: string;

  @IsOptional()
  @IsString()
  drugName?: string;

  @IsString()
  @MinLength(1)
  dosage!: string;

  @IsString()
  @MinLength(1)
  frequency!: string;

  @IsInt()
  @IsPositive()
  durationDays!: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}
