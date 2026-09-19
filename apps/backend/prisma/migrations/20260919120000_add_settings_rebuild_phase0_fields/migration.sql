-- Doctor Settings Rebuild (Phase 0: domain + schema foundation).
-- Additive only: two nullable/defaulted columns on DoctorProfile (mirrors
-- maxFreeSlotsPerDay's own addition), plus a new NotificationPreference
-- table with one row per account, created lazily on first write (no
-- backfill migration needed -- every column defaults to true, preserving
-- today's "everything fires" behavior for existing accounts).

-- AlterTable
ALTER TABLE "DoctorProfile"
  ADD COLUMN "bufferMinutesOverride" INTEGER,
  ADD COLUMN "autoApproveFreeBookings" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "emailAppointments" BOOLEAN NOT NULL DEFAULT true,
    "emailBilling" BOOLEAN NOT NULL DEFAULT true,
    "inAppAppointments" BOOLEAN NOT NULL DEFAULT true,
    "inAppBilling" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_accountId_key" ON "NotificationPreference"("accountId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
