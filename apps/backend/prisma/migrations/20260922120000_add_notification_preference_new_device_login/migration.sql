-- Security Center rework: "email me when my account signs in from a new
-- device". Additive, defaults true -- preserves the security-conscious
-- default for every existing account with no backfill needed.

-- AlterTable
ALTER TABLE "NotificationPreference"
  ADD COLUMN "emailNewDeviceLogin" BOOLEAN NOT NULL DEFAULT true;
