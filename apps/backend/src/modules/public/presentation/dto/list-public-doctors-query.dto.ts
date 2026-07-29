import { IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';

export class ListPublicDoctorsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  specialtyId?: string;
}
