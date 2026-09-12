-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'NEW_PATIENT', 'PROCEDURE');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "appointmentType" "AppointmentType",
ADD COLUMN     "endTime" TIMESTAMP(3);
