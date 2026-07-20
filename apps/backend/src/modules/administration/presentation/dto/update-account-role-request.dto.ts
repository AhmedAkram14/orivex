import { IsEnum } from 'class-validator';

import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';

export class UpdateAccountRoleRequestDto {
  @IsEnum(AccountRole)
  role!: AccountRole;
}
