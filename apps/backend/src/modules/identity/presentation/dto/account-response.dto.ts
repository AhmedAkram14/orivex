import type { Account } from '../../domain/entities/account.entity.js';
import type { AccountRole } from '../../domain/enums/account-role.enum.js';
import type { AccountStatus } from '../../domain/enums/account-status.enum.js';
import type { Gender } from '../../domain/enums/gender.enum.js';
import type { Language } from '../../domain/enums/language.enum.js';

export class AccountResponseDto {
  id!: string;
  email!: string;
  role!: AccountRole;
  status!: AccountStatus;
  displayName!: string;
  phoneNumber?: string;
  preferredLanguage!: Language;
  // Onboarding Redesign (2026-07-21 proposal, §0a): shared cross-role
  // personal-identity fields, extending UserProfile rather than a separate
  // PersonalProfile entity -- consumed by both Patient and Doctor onboarding.
  dateOfBirth?: string;
  gender?: Gender;
  nationalityId?: string;
  address?: string;
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
    dto.dateOfBirth = profile.getDateOfBirth()?.toISOString();
    dto.gender = profile.getGender();
    dto.nationalityId = profile.getNationalityId();
    dto.address = profile.getAddress();
    dto.createdAt = account.getCreatedAt().toISOString();
    dto.updatedAt = account.getUpdatedAt().toISOString();

    return dto;
  }
}
