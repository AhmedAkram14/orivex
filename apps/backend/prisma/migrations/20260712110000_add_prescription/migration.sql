-- Sprint 11: ClinicalModule's Prescription aggregate (docs/10-backend-
-- architecture.md's ClinicalModule entry; docs/09-physical-database.md's
-- prescriptions table). diagnosisNodeId is a real FK to HealthGraphNode.
-- drugCatalogId has no FK -- ReferenceDataModule doesn't exist yet.
-- supersedesPrescriptionId is deliberately not modeled this sprint.

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'SIGNED', 'ACTIVE', 'EXPIRED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "diagnosisNodeId" TEXT NOT NULL,
    "authoringDoctorId" TEXT NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionLineItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "drugCatalogId" TEXT NOT NULL,
    "drugName" TEXT,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "instructions" TEXT,

    CONSTRAINT "PrescriptionLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prescription_consultationSessionId_idx" ON "Prescription"("consultationSessionId");

-- CreateIndex
CREATE INDEX "Prescription_diagnosisNodeId_idx" ON "Prescription"("diagnosisNodeId");

-- CreateIndex
CREATE INDEX "Prescription_authoringDoctorId_idx" ON "Prescription"("authoringDoctorId");

-- CreateIndex
CREATE INDEX "Prescription_status_idx" ON "Prescription"("status");

-- CreateIndex
CREATE INDEX "PrescriptionLineItem_prescriptionId_idx" ON "PrescriptionLineItem"("prescriptionId");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_diagnosisNodeId_fkey" FOREIGN KEY ("diagnosisNodeId") REFERENCES "HealthGraphNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_authoringDoctorId_fkey" FOREIGN KEY ("authoringDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionLineItem" ADD CONSTRAINT "PrescriptionLineItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
