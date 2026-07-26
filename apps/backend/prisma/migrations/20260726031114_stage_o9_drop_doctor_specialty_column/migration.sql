/*
  Warnings:

  - You are about to drop the column `specialty` on the `DoctorProfile` table. All the data in the column will be lost.
  - Made the column `specialtyId` on table `DoctorProfile` required. This step will fail if there are existing NULL values in that column.

*/

-- Onboarding Redesign (2026-07-21 proposal, Stage O.9): the backfill Stage
-- O.3's own migration deferred -- every DoctorProfile row must have a real
-- specialtyId before the deprecated free-text `specialty` column can be
-- dropped and specialtyId can become required. Deliberately narrow: an
-- exact, case-insensitive, trimmed match against MedicalSpecialty.name only.
-- Never fuzzy-guesses a close-but-not-exact match -- the safety check right
-- after this refuses to proceed (and names the exact rows) if any profile
-- still has no match, rather than silently mis-assigning one.
UPDATE "DoctorProfile" dp
SET "specialtyId" = ms.id
FROM "MedicalSpecialty" ms
WHERE dp."specialtyId" IS NULL
  AND lower(trim(dp.specialty)) = lower(trim(ms.name));

-- Fails the whole migration (transactional -- nothing above is kept either)
-- if any DoctorProfile row still has no specialtyId after the exact-match
-- backfill above, naming a sample of the exact rows a human must resolve
-- manually first (correct the free-text specialty, add the missing
-- MedicalSpecialty row, or set specialtyId by hand) -- never drops data or
-- guesses silently.
DO $$
DECLARE
  unmatched_count integer;
  unmatched_sample text;
BEGIN
  SELECT count(*) INTO unmatched_count FROM "DoctorProfile" WHERE "specialtyId" IS NULL;
  IF unmatched_count > 0 THEN
    SELECT string_agg(format('id=%s specialty=%L', id, specialty), ', ')
      INTO unmatched_sample
      FROM (SELECT id, specialty FROM "DoctorProfile" WHERE "specialtyId" IS NULL LIMIT 10) t;
    RAISE EXCEPTION 'Stage O.9 backfill blocked: % DoctorProfile row(s) have no specialtyId match against MedicalSpecialty.name. Resolve manually first, then re-run this migration (sample: %)', unmatched_count, unmatched_sample;
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "DoctorProfile" DROP CONSTRAINT "DoctorProfile_specialtyId_fkey";

-- AlterTable
ALTER TABLE "DoctorProfile" DROP COLUMN "specialty",
ALTER COLUMN "specialtyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "MedicalSpecialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
