-- Knowledge Center Hardening Phase 0 (domain + schema foundation).
-- Additive: adds a new status value, a new language enum, and four new
-- columns on KnowledgeArticle, then backfills existing rows before
-- tightening the two required-going-forward columns to NOT NULL.

-- AlterEnum: DRAFT is the earliest lifecycle stage, placed first so the
-- enum's own declared/ordinal order matches the domain's Draft ->
-- PendingReview -> Published|Rejected -> Archived narrative. (Checked: no
-- application code sorts/compares KnowledgeArticleStatus by ordinal
-- position -- see this phase's own report for what was searched.)
ALTER TYPE "KnowledgeArticleStatus" ADD VALUE 'DRAFT' BEFORE 'PENDING_REVIEW';

-- CreateEnum
CREATE TYPE "KnowledgeArticleLanguage" AS ENUM ('ARABIC', 'ENGLISH');

-- AlterTable: add the new columns nullable first (safe multi-step pattern
-- for adding required columns to a populated table). viewCount needs no
-- backfill step of its own -- DEFAULT 0 already backfills every existing
-- row when the column is added.
ALTER TABLE "KnowledgeArticle"
  ADD COLUMN "specialtyId" TEXT,
  ADD COLUMN "language" "KnowledgeArticleLanguage",
  ADD COLUMN "sourcesText" TEXT,
  ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill specialtyId deterministically from each article's authoring
-- doctor's own current specialty (decision 6) -- never left null/broken.
UPDATE "KnowledgeArticle" AS article
SET "specialtyId" = "doctorProfile"."specialtyId"
FROM "DoctorProfile" AS "doctorProfile"
WHERE "doctorProfile"."id" = article."authoringDoctorId";

-- Backfill language to ARABIC for all pre-existing rows -- this is a
-- default guess for pre-existing content, not a real signal, per the
-- platform's Arabic-first principle (decision 6/PRD localization posture).
UPDATE "KnowledgeArticle"
SET "language" = 'ARABIC'
WHERE "language" IS NULL;

-- Both fields are required going forward (backfill above guarantees no
-- null rows remain).
ALTER TABLE "KnowledgeArticle" ALTER COLUMN "specialtyId" SET NOT NULL;
ALTER TABLE "KnowledgeArticle" ALTER COLUMN "language" SET NOT NULL;

-- AddForeignKey: mirrors DoctorProfile.specialtyId's own onDelete Restrict --
-- a MedicalSpecialty referenced by a real article can't be deleted out from
-- under it.
ALTER TABLE "KnowledgeArticle"
  ADD CONSTRAINT "KnowledgeArticle_specialtyId_fkey"
  FOREIGN KEY ("specialtyId") REFERENCES "MedicalSpecialty"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "KnowledgeArticle_specialtyId_idx" ON "KnowledgeArticle"("specialtyId");
