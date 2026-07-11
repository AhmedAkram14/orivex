-- Sprint 7 (revised roadmap): DoctorModule's AvailabilityWindow
-- (docs/10-backend-architecture.md's DoctorModule entry). SchedulingModule
-- owns no persistence of its own. Deliberately independent of Appointment --
-- Booking integrates later.

-- CreateEnum
CREATE TYPE "AvailabilityWindowStatus" AS ENUM ('OPEN', 'HELD', 'BOOKED');

-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('FREE', 'PAID');

-- CreateTable
CREATE TABLE "AvailabilityWindow" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "consultationType" "ConsultationType" NOT NULL,
    "status" "AvailabilityWindowStatus" NOT NULL DEFAULT 'OPEN',
    "holdExpiresAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityWindow_doctorId_startTime_idx" ON "AvailabilityWindow"("doctorId", "startTime");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_status_idx" ON "AvailabilityWindow"("status");

-- AddForeignKey
ALTER TABLE "AvailabilityWindow" ADD CONSTRAINT "AvailabilityWindow_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
