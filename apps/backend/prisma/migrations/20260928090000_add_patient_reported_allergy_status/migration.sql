-- Patient-Reported Allergy Status (2026-09-28): the patient's own answer to
-- "do you have any allergies?", tracked separately from the doctor's own
-- allergiesConfirmedNoneAt attestation added in 20260924090000 -- neither
-- ever satisfies the other (enforced in the domain layer, not here).
-- Additive and backward compatible: every existing row defaults to
-- 'unknown', except a patient who already has real allergy text on record,
-- backfilled below to 'has_allergies' so the column is never out of sync
-- with data that already existed before it did.

-- AlterTable
ALTER TABLE "PatientProfile"
  ADD COLUMN "allergiesStatus" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "allergiesStatusUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "allergiesStatusUpdatedByRole" TEXT;

-- Backfill: a patient who already has a real, non-empty allergy on record
-- clearly isn't "unknown" -- mark it derived (has_allergies), with no actor
-- role (this reflects data that predates the field, not a real answer).
UPDATE "PatientProfile"
SET "allergiesStatus" = 'has_allergies',
    "allergiesStatusUpdatedAt" = "updatedAt"
WHERE "allergies" IS NOT NULL AND trim("allergies") <> '';
