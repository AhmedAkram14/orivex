import type { AccountRole } from '../../../domain/enums/account-role.enum.js';

export interface UpdateAccountRoleCommandProps {
  accountId: string;
  newRole: AccountRole;
}

// Commands are application messages, not structural types — immutable by
// construction (all fields readonly, no mutators).
export class UpdateAccountRoleCommand {
  readonly accountId: string;
  readonly newRole: AccountRole;

  constructor(props: UpdateAccountRoleCommandProps) {
    this.accountId = props.accountId;
    this.newRole = props.newRole;
  }
}
