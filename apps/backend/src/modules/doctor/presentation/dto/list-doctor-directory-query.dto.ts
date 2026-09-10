import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';

// Extends the shared PaginationQueryDto (page/limit) with the Stage O.1
// filters, plus I10's doctor discovery filters (docs/01-prd.md names 9).
// `condition` is deliberately NOT modeled here -- see
// prisma-doctor-directory-query.service.ts's own comment on why its
// semantics are genuinely undefined in the PRD/domain model, a disclosed
// gap rather than a guessed one.
export class ListDoctorDirectoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  specialty?: string;

  // Onboarding Redesign (2026-07-21 proposal, Stage O.3): honored alongside
  // (not instead of) the free-text `specialty` filter above.
  @IsOptional()
  @IsUUID('4')
  specialtyId?: string;

  @IsOptional()
  @IsUUID('4')
  hospitalId?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFeeAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxFeeAmount?: number;

  @IsOptional()
  @IsIn(['FREE', 'PAID'])
  consultationType?: 'FREE' | 'PAID';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minYearsOfExperience?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  availableWithinDays?: number;

  // I10 -- Doctor discovery filters: "average rating >= this threshold."
  // Real number (not integer-only) so the frontend can offer a "4.5+"
  // option, matching ConsultationFeedback.rating's own 1-5 domain range
  // (consultation-feedback.entity.ts's MIN_RATING/MAX_RATING) -- an average
  // can be fractional even though each individual rating is an integer.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;
}
