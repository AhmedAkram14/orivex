import { SecurityEventStatus as PrismaSecurityEventStatus, SecurityEventType as PrismaSecurityEventType } from '@prisma/client';
import type { Prisma, SecurityEvent as PrismaSecurityEventRow } from '@prisma/client';

import { SecurityEvent } from '../../domain/entities/security-event.entity.js';
import { SecurityEventStatus } from '../../domain/enums/security-event-status.enum.js';
import { SecurityEventType } from '../../domain/enums/security-event-type.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake. This is the sole place the two vocabularies are translated
// (mirrors verification-status.mapper.ts's established pattern).
const DOMAIN_TO_PRISMA_EVENT_TYPE: Record<SecurityEventType, PrismaSecurityEventType> = {
  [SecurityEventType.LoginSucceeded]: PrismaSecurityEventType.LOGIN_SUCCEEDED,
  [SecurityEventType.LoginFailed]: PrismaSecurityEventType.LOGIN_FAILED,
  [SecurityEventType.AccountLocked]: PrismaSecurityEventType.ACCOUNT_LOCKED,
  [SecurityEventType.AccountUnlocked]: PrismaSecurityEventType.ACCOUNT_UNLOCKED,
  [SecurityEventType.PasswordChanged]: PrismaSecurityEventType.PASSWORD_CHANGED,
  [SecurityEventType.PasswordResetRequested]: PrismaSecurityEventType.PASSWORD_RESET_REQUESTED,
  [SecurityEventType.PasswordResetCompleted]: PrismaSecurityEventType.PASSWORD_RESET_COMPLETED,
  [SecurityEventType.EmailVerified]: PrismaSecurityEventType.EMAIL_VERIFIED,
  [SecurityEventType.SessionRevoked]: PrismaSecurityEventType.SESSION_REVOKED,
  [SecurityEventType.RefreshTokenReuseDetected]: PrismaSecurityEventType.REFRESH_TOKEN_REUSE_DETECTED,
};

const PRISMA_TO_DOMAIN_EVENT_TYPE: Record<PrismaSecurityEventType, SecurityEventType> = {
  [PrismaSecurityEventType.LOGIN_SUCCEEDED]: SecurityEventType.LoginSucceeded,
  [PrismaSecurityEventType.LOGIN_FAILED]: SecurityEventType.LoginFailed,
  [PrismaSecurityEventType.ACCOUNT_LOCKED]: SecurityEventType.AccountLocked,
  [PrismaSecurityEventType.ACCOUNT_UNLOCKED]: SecurityEventType.AccountUnlocked,
  [PrismaSecurityEventType.PASSWORD_CHANGED]: SecurityEventType.PasswordChanged,
  [PrismaSecurityEventType.PASSWORD_RESET_REQUESTED]: SecurityEventType.PasswordResetRequested,
  [PrismaSecurityEventType.PASSWORD_RESET_COMPLETED]: SecurityEventType.PasswordResetCompleted,
  [PrismaSecurityEventType.EMAIL_VERIFIED]: SecurityEventType.EmailVerified,
  [PrismaSecurityEventType.SESSION_REVOKED]: SecurityEventType.SessionRevoked,
  [PrismaSecurityEventType.REFRESH_TOKEN_REUSE_DETECTED]: SecurityEventType.RefreshTokenReuseDetected,
};

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaSecurityEventStatus, SecurityEventStatus> = {
  [PrismaSecurityEventStatus.DETECTED]: SecurityEventStatus.Detected,
  [PrismaSecurityEventStatus.REVIEWED]: SecurityEventStatus.Reviewed,
  [PrismaSecurityEventStatus.RESOLVED]: SecurityEventStatus.Resolved,
};

export interface PersistedSecurityEvent {
  id: string;
  accountId: string;
  eventType: PrismaSecurityEventType;
  status: PrismaSecurityEventStatus;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.InputJsonValue;
  detectedAt: Date;
}

// The one place that knows how the SecurityEvent aggregate maps to Prisma's
// row shape, both directions.
export function toPersistedSecurityEvent(event: SecurityEvent): PersistedSecurityEvent {
  return {
    id: event.getId(),
    accountId: event.getAccountId(),
    eventType: DOMAIN_TO_PRISMA_EVENT_TYPE[event.getEventType()],
    status: PrismaSecurityEventStatus.DETECTED,
    ipAddress: event.getIpAddress() ?? null,
    userAgent: event.getUserAgent() ?? null,
    metadata: event.getMetadata() as Prisma.InputJsonValue,
    detectedAt: event.getDetectedAt(),
  };
}

// Reverse mapping, added for the login-history read path (GET
// /auth/login-history) -- the metadata JSON column round-trips through
// Prisma as a plain object already, so no further translation is needed.
export function toDomainSecurityEvent(row: PrismaSecurityEventRow): SecurityEvent {
  return SecurityEvent.reconstitute({
    id: row.id,
    accountId: row.accountId,
    eventType: PRISMA_TO_DOMAIN_EVENT_TYPE[row.eventType],
    status: PRISMA_TO_DOMAIN_STATUS[row.status],
    ipAddress: row.ipAddress ?? undefined,
    userAgent: row.userAgent ?? undefined,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    detectedAt: row.detectedAt,
  });
}
