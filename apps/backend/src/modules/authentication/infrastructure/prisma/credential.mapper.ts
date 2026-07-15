import type { Credential as PrismaCredentialRow } from '@prisma/client';
import { CredentialStatus as PrismaCredentialStatus } from '@prisma/client';

import { Credential } from '../../domain/entities/credential.entity.js';
import { CredentialStatus } from '../../domain/enums/credential-status.enum.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.value-object.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake. This is the sole place the two vocabularies are translated
// (mirrors verification-status.mapper.ts's established pattern).
const DOMAIN_TO_PRISMA_STATUS: Record<CredentialStatus, PrismaCredentialStatus> = {
  [CredentialStatus.Active]: PrismaCredentialStatus.ACTIVE,
  [CredentialStatus.Locked]: PrismaCredentialStatus.LOCKED,
};

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaCredentialStatus, CredentialStatus> = {
  [PrismaCredentialStatus.ACTIVE]: CredentialStatus.Active,
  [PrismaCredentialStatus.LOCKED]: CredentialStatus.Locked,
};

export interface PersistedCredential {
  id: string;
  accountId: string;
  passwordHash: string;
  status: PrismaCredentialStatus;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// The one place that knows how the Credential aggregate maps to/from
// Prisma's row shape. Domain layer stays entirely unaware of Prisma.
export function toDomainCredential(row: PrismaCredentialRow): Credential {
  return Credential.reconstitute({
    id: row.id,
    accountId: row.accountId,
    passwordHash: PasswordHash.create(row.passwordHash),
    status: PRISMA_TO_DOMAIN_STATUS[row.status],
    failedLoginAttempts: row.failedLoginAttempts,
    lockedUntil: row.lockedUntil ?? undefined,
    emailVerifiedAt: row.emailVerifiedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function toPersistedCredential(credential: Credential): PersistedCredential {
  return {
    id: credential.getId(),
    accountId: credential.getAccountId(),
    passwordHash: credential.getPasswordHash().toString(),
    status: DOMAIN_TO_PRISMA_STATUS[credential.getStatus()],
    failedLoginAttempts: credential.getFailedLoginAttempts(),
    lockedUntil: credential.getLockedUntil() ?? null,
    emailVerifiedAt: credential.getEmailVerifiedAt() ?? null,
    createdAt: credential.getCreatedAt(),
    updatedAt: credential.getUpdatedAt(),
  };
}
