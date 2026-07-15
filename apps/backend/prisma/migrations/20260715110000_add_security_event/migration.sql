-- Sprint 15: TrustModule's SecurityEvent aggregate (docs/10-backend-
-- architecture.md's TrustModule entry; docs/09-physical-database.md's
-- security_events table). Documented since the original data-model phase
-- but never implemented until now -- AuthenticationModule is the actual
-- producer of every event this table's documented purpose describes
-- (failed logins, lockouts, password resets, refresh-token reuse).

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'EMAIL_VERIFIED', 'SESSION_REVOKED', 'REFRESH_TOKEN_REUSE_DETECTED');

-- CreateEnum
CREATE TYPE "SecurityEventStatus" AS ENUM ('DETECTED', 'REVIEWED', 'RESOLVED');

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventType" "SecurityEventType" NOT NULL,
    "status" "SecurityEventStatus" NOT NULL DEFAULT 'DETECTED',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEvent_accountId_idx" ON "SecurityEvent"("accountId");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");

-- CreateIndex
CREATE INDEX "SecurityEvent_status_idx" ON "SecurityEvent"("status");

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
