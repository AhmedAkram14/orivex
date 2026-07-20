import { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { AccountRole } from '../enums/account-role.enum.js';

// ORIVEX Roadmap 2.0 Stage 4: raised by Account.changeRole(). Named
// generically ("changed"), not "promoted"/"demoted" -- the domain has no
// concept of a role hierarchy, only a change from one finite state to
// another.
export class AccountRoleChangedEvent extends DomainEvent {
  readonly eventName = 'identity.account.role-changed';

  constructor(
    public readonly accountId: string,
    public readonly previousRole: AccountRole,
    public readonly newRole: AccountRole,
  ) {
    super();
  }
}
