-- Patient Record Page P0 fix: which doctor confirmed "no known allergies",
-- so the chart can honestly show "confirmed by Dr. X" instead of a bare
-- timestamp. Additive, nullable, SetNull on delete -- every row confirmed
-- before this column existed keeps allergiesConfirmedByDoctorId NULL, which
-- is a normal, fully-supported state, not backfilled.

-- AlterTable
ALTER TABLE "PatientProfile"
  ADD COLUMN "allergiesConfirmedByDoctorId" TEXT;

-- CreateIndex
CREATE INDEX "PatientProfile_allergiesConfirmedByDoctorId_idx" ON "PatientProfile"("allergiesConfirmedByDoctorId");

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_allergiesConfirmedByDoctorId_fkey" FOREIGN KEY ("allergiesConfirmedByDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
