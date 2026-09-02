-- AlterTable
ALTER TABLE "DoctorProfile" ALTER COLUMN "insuranceProviders" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VitalReading" ADD COLUMN     "consultationSessionId" TEXT,
ADD COLUMN     "recordedByDoctorId" TEXT;

-- CreateIndex
CREATE INDEX "VitalReading_recordedByDoctorId_idx" ON "VitalReading"("recordedByDoctorId");

-- CreateIndex
CREATE INDEX "VitalReading_consultationSessionId_idx" ON "VitalReading"("consultationSessionId");

-- AddForeignKey
ALTER TABLE "VitalReading" ADD CONSTRAINT "VitalReading_recordedByDoctorId_fkey" FOREIGN KEY ("recordedByDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalReading" ADD CONSTRAINT "VitalReading_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
