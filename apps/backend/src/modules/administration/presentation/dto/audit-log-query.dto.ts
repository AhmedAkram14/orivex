import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';

// I11 -- Admin audit-log viewer: every filter is optional, matching
// VerificationQueueQueryDto's own "narrow only what the admin actually
// picked" shape.
export class AuditLogQueryDto {
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

  @IsOptional()
  @IsUUID()
  actorAccountId?: string;

  @IsOptional()
  @IsString()
  subjectType?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;
}
