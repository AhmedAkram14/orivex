import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { ReviewModerationStatus } from '../../../consultation/domain/enums/review-moderation-status.enum.js';

// I11 -- Admin content moderation: omitted status defaults to Flagged in
// the controller (the actual moderation queue an admin needs to act on) --
// an explicit status (e.g. Hidden) is how an admin audits past decisions.
export class ListReviewsQueryDto {
  @IsOptional()
  @IsEnum(ReviewModerationStatus)
  status?: ReviewModerationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
