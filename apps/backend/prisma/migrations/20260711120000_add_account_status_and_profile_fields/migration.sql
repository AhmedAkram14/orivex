-- Synchronizes the persistence model with the already-approved Identity
-- domain model (Sprints 1.1A/1.1B). A documentation synchronization task is
-- scheduled after Sprint 1.1C to bring docs/08-logical-data-model.md and
-- docs/09-physical-database.md in line with these fields.

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Account" ADD COLUMN "displayName" TEXT NOT NULL;
ALTER TABLE "Account" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "Account" ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'Arabic';
