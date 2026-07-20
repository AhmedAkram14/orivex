import { IsEnum, IsOptional } from 'class-validator';

import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';

// Extends the shared PaginationQueryDto (page/limit) with an optional role
// filter -- matches AppointmentController/NotificationController's own
// pagination convention exactly.
export class ListAccountsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AccountRole)
  role?: AccountRole;
}
