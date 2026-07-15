import type { AuthToken as PrismaAuthTokenRow } from '@prisma/client';
import { TokenPurpose as PrismaTokenPurpose, TokenStatus as PrismaTokenStatus } from '@prisma/client';

import { AuthToken } from '../../domain/entities/auth-token.entity.js';
import { TokenPurpose } from '../../domain/enums/token-purpose.enum.js';
import { TokenStatus } from '../../domain/enums/token-status.enum.js';
import { TokenHash } from '../../domain/value-objects/token-hash.value-object.js';

const DOMAIN_TO_PRISMA_PURPOSE: Record<TokenPurpose, PrismaTokenPurpose> = {
  [TokenPurpose.EmailVerification]: PrismaTokenPurpose.EMAIL_VERIFICATION,
  [TokenPurpose.PasswordReset]: PrismaTokenPurpose.PASSWORD_RESET,
};

const PRISMA_TO_DOMAIN_PURPOSE: Record<PrismaTokenPurpose, TokenPurpose> = {
  [PrismaTokenPurpose.EMAIL_VERIFICATION]: TokenPurpose.EmailVerification,
  [PrismaTokenPurpose.PASSWORD_RESET]: TokenPurpose.PasswordReset,
};

const DOMAIN_TO_PRISMA_STATUS: Record<TokenStatus, PrismaTokenStatus> = {
  [TokenStatus.Active]: PrismaTokenStatus.ACTIVE,
  [TokenStatus.Used]: PrismaTokenStatus.USED,
  [TokenStatus.Revoked]: PrismaTokenStatus.REVOKED,
  [TokenStatus.Expired]: PrismaTokenStatus.EXPIRED,
};

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaTokenStatus, TokenStatus> = {
  [PrismaTokenStatus.ACTIVE]: TokenStatus.Active,
  [PrismaTokenStatus.USED]: TokenStatus.Used,
  [PrismaTokenStatus.REVOKED]: TokenStatus.Revoked,
  [PrismaTokenStatus.EXPIRED]: TokenStatus.Expired,
};

export interface PersistedAuthToken {
  id: string;
  credentialId: string;
  tokenHash: string;
  purpose: PrismaTokenPurpose;
  status: PrismaTokenStatus;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export function toPrismaTokenPurpose(purpose: TokenPurpose): PrismaTokenPurpose {
  return DOMAIN_TO_PRISMA_PURPOSE[purpose];
}

export function toDomainAuthToken(row: PrismaAuthTokenRow): AuthToken {
  return AuthToken.reconstitute({
    id: row.id,
    credentialId: row.credentialId,
    tokenHash: TokenHash.create(row.tokenHash),
    purpose: PRISMA_TO_DOMAIN_PURPOSE[row.purpose],
    status: PRISMA_TO_DOMAIN_STATUS[row.status],
    expiresAt: row.expiresAt,
    usedAt: row.usedAt ?? undefined,
    createdAt: row.createdAt,
  });
}

export function toPersistedAuthToken(token: AuthToken): PersistedAuthToken {
  return {
    id: token.getId(),
    credentialId: token.getCredentialId(),
    tokenHash: token.getTokenHash().toString(),
    purpose: DOMAIN_TO_PRISMA_PURPOSE[token.getPurpose()],
    status: DOMAIN_TO_PRISMA_STATUS[token.getStatus()],
    expiresAt: token.getExpiresAt(),
    usedAt: token.getUsedAt() ?? null,
    createdAt: token.getCreatedAt(),
  };
}
