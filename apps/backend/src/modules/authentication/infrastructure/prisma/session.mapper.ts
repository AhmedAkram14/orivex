import type { Session as PrismaSessionRow } from '@prisma/client';

import { Session } from '../../domain/entities/session.entity.js';
import { TokenHash } from '../../domain/value-objects/token-hash.value-object.js';

export interface PersistedSession {
  id: string;
  credentialId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date;
  createdAt: Date;
}

export function toDomainSession(row: PrismaSessionRow): Session {
  return Session.reconstitute({
    id: row.id,
    credentialId: row.credentialId,
    refreshTokenHash: TokenHash.create(row.refreshTokenHash),
    userAgent: row.userAgent ?? undefined,
    ipAddress: row.ipAddress ?? undefined,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt ?? undefined,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  });
}

export function toPersistedSession(session: Session): PersistedSession {
  return {
    id: session.getId(),
    credentialId: session.getCredentialId(),
    refreshTokenHash: session.getRefreshTokenHash().toString(),
    userAgent: session.getUserAgent() ?? null,
    ipAddress: session.getIpAddress() ?? null,
    expiresAt: session.getExpiresAt(),
    revokedAt: session.getRevokedAt() ?? null,
    lastUsedAt: session.getLastUsedAt(),
    createdAt: session.getCreatedAt(),
  };
}
