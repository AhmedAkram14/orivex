import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { DisputeCategory } from '../../domain/enums/dispute-category.enum.js';

export class RaiseDisputeRequestDto {
  @IsUUID()
  appointmentId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;

  // Dispute System Hardening Phase 1: required going forward at this layer
  // (existing rows predate the field -- see the domain/Prisma schema's own
  // comment on its nullability there).
  @IsEnum(DisputeCategory)
  category!: DisputeCategory;

  // Dispute System Hardening Phase 1: optional single-file evidence
  // attachment, reusing the existing upload-intent/confirm MediaAsset flow
  // (same shape as SendMessageRequestDto's own attachmentAssetId).
  @IsOptional()
  @IsUUID()
  attachmentAssetId?: string;
}
