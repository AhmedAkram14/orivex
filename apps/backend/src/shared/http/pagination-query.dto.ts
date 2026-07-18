import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Shared optional pagination query params (Production Readiness Audit --
// "introduce pagination where required"). page defaults to 1, limit
// defaults to 50 (generous enough that any caller not yet passing these
// params sees identical results to the previous unbounded query, for every
// realistic dataset size today) and is capped at 100 to prevent an
// arbitrarily large single request.
export class PaginationQueryDto {
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
