-- Doctor Profile Redesign (2026-08-02): backs the Doctor Profile page's
-- "Insurance" list and "Experience" work-history timeline. insuranceProviders
-- is a plain string list, same storage convention as the existing
-- DoctorProfile.languages column. PortfolioWorkExperience is a new child
-- table, structurally identical to the existing PortfolioPublication/
-- PortfolioAward tables.

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "insuranceProviders" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "PortfolioWorkExperience" (
    "id" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioWorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioWorkExperience_doctorProfileId_idx" ON "PortfolioWorkExperience"("doctorProfileId");

-- AddForeignKey
ALTER TABLE "PortfolioWorkExperience" ADD CONSTRAINT "PortfolioWorkExperience_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
