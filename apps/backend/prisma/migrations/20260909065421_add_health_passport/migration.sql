-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "lifestyleNotes" TEXT,
ADD COLUMN     "nutritionNotes" TEXT,
ADD COLUMN     "exerciseNotes" TEXT,
ADD COLUMN     "mentalHealthNotes" TEXT;

-- CreateEnum
CREATE TYPE "HealthPassportEntryCategory" AS ENUM ('VACCINATION', 'FAMILY_HISTORY', 'SURGERY', 'MEDICATION');

-- CreateTable
CREATE TABLE "HealthPassportEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "category" "HealthPassportEntryCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthPassportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthPassportEntry_patientId_category_idx" ON "HealthPassportEntry"("patientId", "category");

-- AddForeignKey
ALTER TABLE "HealthPassportEntry" ADD CONSTRAINT "HealthPassportEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- I6 follow-up to the Consent gap fix's own migration comment ("adding
-- [mental_health] is a one-row follow-up once I6 ships, not a schema
-- change") -- mentalHealthNotes now exists on PatientProfile above, so this
-- scope category has a real field to gate.
INSERT INTO "ConsentScopeCategory" ("id", "code", "name", "isActive", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000002', 'mental_health', 'Mental Health Data', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
