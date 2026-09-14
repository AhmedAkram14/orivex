-- CreateEnum
CREATE TYPE "VitalReadingSource" AS ENUM ('CLINICAL', 'PATIENT_REPORTED', 'DEVICE');

-- AlterTable
ALTER TABLE "VitalReading" ADD COLUMN     "externalObservationId" TEXT,
ADD COLUMN     "source" "VitalReadingSource" NOT NULL DEFAULT 'CLINICAL',
ADD COLUMN     "sourceProvider" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VitalReading_sourceProvider_externalObservationId_key" ON "VitalReading"("sourceProvider", "externalObservationId");
