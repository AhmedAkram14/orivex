-- ClinicalModule's own VitalReading aggregate (docs/05-information-
-- architecture.md's Health Dashboard concept). There is no vitals concept
-- anywhere else in the platform yet (HealthGraphNode's nodeType enum only
-- covers condition/symptom/medication/lab_result/radiology_result), and no
-- create/record-vital producer exists on either side yet, so this table
-- starts empty. CASCADE from PatientProfile matches VitalReading's status
-- as a patient-owned clinical fact, deleted along with the profile.

-- CreateEnum
CREATE TYPE "VitalType" AS ENUM ('WEIGHT', 'BLOOD_PRESSURE', 'BLOOD_SUGAR');

-- CreateTable
CREATE TABLE "VitalReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "VitalType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "diastolicValue" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VitalReading_patientId_idx" ON "VitalReading"("patientId");

-- CreateIndex
CREATE INDEX "VitalReading_type_idx" ON "VitalReading"("type");

-- AddForeignKey
ALTER TABLE "VitalReading" ADD CONSTRAINT "VitalReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
