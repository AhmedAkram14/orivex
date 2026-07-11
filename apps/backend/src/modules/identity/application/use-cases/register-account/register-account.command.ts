import type { AccountRole } from '../../../domain/enums/account-role.enum.js';
import type { Language } from '../../../domain/enums/language.enum.js';

export interface RegisterAccountCommandProps {
  email: string;
  keycloakId: string;
  role: AccountRole;
  displayName: string;
  preferredLanguage?: Language;
}

// Commands are application messages, not structural types — immutable by
// construction (all fields readonly, no mutators).
export class RegisterAccountCommand {
  readonly email: string;
  readonly keycloakId: string;
  readonly role: AccountRole;
  readonly displayName: string;
  readonly preferredLanguage?: Language;

  constructor(props: RegisterAccountCommandProps) {
    this.email = props.email;
    this.keycloakId = props.keycloakId;
    this.role = props.role;
    this.displayName = props.displayName;
    this.preferredLanguage = props.preferredLanguage;
  }
}
