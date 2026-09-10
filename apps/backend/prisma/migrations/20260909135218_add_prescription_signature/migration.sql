-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "signatureHash" TEXT,
ADD COLUMN     "verificationCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_verificationCode_key" ON "Prescription"("verificationCode");
