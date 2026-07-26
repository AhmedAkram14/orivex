import type { Account as PrismaAccountRow } from '@prisma/client';

import { Account } from '../../domain/entities/account.entity.js';
import { UserProfile } from '../../domain/entities/user-profile.entity.js';
import { AccountRole } from '../../domain/enums/account-role.enum.js';
import { AccountStatus } from '../../domain/enums/account-status.enum.js';
import { Gender } from '../../domain/enums/gender.enum.js';
import { Language } from '../../domain/enums/language.enum.js';
import { AccountId } from '../../domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../domain/value-objects/email-address.value-object.js';

export interface PersistedAccount {
  id: string;
  email: string;
  role: string;
  status: string;
  displayName: string;
  phoneNumber: string | null;
  preferredLanguage: string;
  dateOfBirth: Date | null;
  gender: string | null;
  nationalityId: string | null;
  address: string | null;
}

// The one place that knows how the Account aggregate maps to/from Prisma's
// row shape. Domain layer stays entirely unaware of Prisma.
export function toDomainAccount(row: PrismaAccountRow): Account {
  return Account.reconstitute({
    id: AccountId.create(row.id),
    email: EmailAddress.create(row.email),
    role: row.role as AccountRole,
    status: row.status as AccountStatus,
    userProfile: UserProfile.create({
      displayName: DisplayName.create(row.displayName),
      phoneNumber: row.phoneNumber ?? undefined,
      preferredLanguage: row.preferredLanguage as Language,
      dateOfBirth: row.dateOfBirth ?? undefined,
      gender: (row.gender as Gender | null) ?? undefined,
      nationalityId: row.nationalityId ?? undefined,
      address: row.address ?? undefined,
    }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function toPersistedAccount(account: Account): PersistedAccount {
  const profile = account.getUserProfile();

  return {
    id: account.getId().toString(),
    email: account.getEmail().toString(),
    role: account.getRole(),
    status: account.getStatus(),
    displayName: profile.getDisplayName().toString(),
    phoneNumber: profile.getPhoneNumber() ?? null,
    preferredLanguage: profile.getPreferredLanguage(),
    dateOfBirth: profile.getDateOfBirth() ?? null,
    gender: profile.getGender() ?? null,
    nationalityId: profile.getNationalityId() ?? null,
    address: profile.getAddress() ?? null,
  };
}
