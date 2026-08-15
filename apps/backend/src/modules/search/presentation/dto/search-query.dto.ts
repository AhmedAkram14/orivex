import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import type { SearchResultType } from '../../application/use-cases/global-search/global-search.use-case.js';

// `q` deliberately has no @MinLength validator. A query shorter than 2
// characters is documented API behaviour -- GlobalSearchUseCase returns an
// honest empty result set with no DB query, not an error -- so enforcing a
// minimum length here would turn that into a 400 via the shared
// ValidationPipe (forbidNonWhitelisted: true) and contradict the documented
// contract. The length check lives in the use-case instead.
export class SearchQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @IsIn(['doctor', 'patient', 'appointment'])
  type?: SearchResultType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}
