import type { AccountRole } from '../../../domain/enums/account-role.enum.js';
import type { Language } from '../../../domain/enums/language.enum.js';

export interface RegisterAccountCommand {
  email: string;
  keycloakId: string;
  role: AccountRole;
  displayName: string;
  preferredLanguage?: Language;
}
