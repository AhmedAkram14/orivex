-- CreateEnum
CREATE TYPE "ConsentState" AS ENUM ('GRANTED', 'REVOKED');

-- CreateTable
CREATE TABLE "ConsentScopeCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentScopeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "scopeCategoryId" TEXT NOT NULL,
    "state" "ConsentState" NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentScopeCategory_code_key" ON "ConsentScopeCategory"("code");

-- CreateIndex
CREATE INDEX "ConsentRecord_patientId_doctorId_scopeCategoryId_idx" ON "ConsentRecord"("patientId", "doctorId", "scopeCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_patientId_doctorId_scopeCategoryId_versionNum_key" ON "ConsentRecord"("patientId", "doctorId", "scopeCategoryId", "versionNumber");

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_scopeCategoryId_fkey" FOREIGN KEY ("scopeCategoryId") REFERENCES "ConsentScopeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the one real scope category this pass has an actual consumer for.
-- "mental_health" is deliberately NOT seeded here -- see schema.prisma's
-- own comment on ConsentScopeCategory for why. A literal, fixed id (rather
-- than a generated one) matches this table's own @id column having no
-- database-level default -- Prisma generates ids application-side, and this
-- is the one row this migration itself is responsible for creating.
INSERT INTO "ConsentScopeCategory" ("id", "code", "name", "isActive", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'general', 'General Health Data', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
