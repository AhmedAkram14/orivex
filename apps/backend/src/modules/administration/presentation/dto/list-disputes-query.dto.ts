import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { DisputeStatus } from '../../../consultation/domain/enums/dispute-status.enum.js';

// I11 -- Admin dispute resolution: omitted status defaults to Open in the
// controller (the actual queue an admin needs to act on).
export class ListDisputesQueryDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

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
