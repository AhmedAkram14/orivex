import { SecurityEventStatus as PrismaSecurityEventStatus, SecurityEventType as PrismaSecurityEventType } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import type { SecurityEvent } from '../../domain/entities/security-event.entity.js';
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
// row shape. Write-only (no toDomainSecurityEvent) — nothing reads this
// aggregate back yet (see security-event.entity.ts's reconstitute() note).
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
