import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

import type { LoginHistoryOutcomeFilter } from '../../application/use-cases/list-login-history-for-account/list-login-history-for-account.query.js';

export class LoginHistoryQueryDto {
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
  limit?: number = 20;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['all', 'success', 'failed'])
  outcome?: LoginHistoryOutcomeFilter = 'all';
}
