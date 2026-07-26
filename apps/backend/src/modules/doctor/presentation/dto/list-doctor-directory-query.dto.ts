import { IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';

// Extends the shared PaginationQueryDto (page/limit) with the Stage O.1
// filters -- matches ListAccountsQueryDto's own convention exactly.
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
}
