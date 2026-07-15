import type { Account } from '../../domain/entities/account.entity.js';
import type { AccountRole } from '../../domain/enums/account-role.enum.js';
import type { AccountStatus } from '../../domain/enums/account-status.enum.js';
import type { Language } from '../../domain/enums/language.enum.js';

export class AccountResponseDto {
  id!: string;
  email!: string;
  role!: AccountRole;
  status!: AccountStatus;
  displayName!: string;
  phoneNumber?: string;
  preferredLanguage!: Language;
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(account: Account): AccountResponseDto {
    const profile = account.getUserProfile();
    const dto = new AccountResponseDto();

    dto.id = account.getId().toString();
    dto.email = account.getEmail().toString();
    dto.role = account.getRole();
    dto.status = account.getStatus();
    dto.displayName = profile.getDisplayName().toString();
    dto.phoneNumber = profile.getPhoneNumber();
    dto.preferredLanguage = profile.getPreferredLanguage();
    dto.createdAt = account.getCreatedAt().toISOString();
    dto.updatedAt = account.getUpdatedAt().toISOString();

    return dto;
  }
}
