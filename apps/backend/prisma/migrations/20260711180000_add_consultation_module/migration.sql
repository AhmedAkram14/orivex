-- Sprint 8: ConsultationModule (docs/10-backend-architecture.md's
-- ConsultationModule entry: Appointment, ConsultationSession,
-- SessionConnectionLog). linkedJourneyId is deliberately not stored.
-- rescheduledFrom is a real self-referential relation.

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConsultationState" AS ENUM ('WAITING_ROOM', 'IN_PROGRESS', 'COMPLETED', 'INTERRUPTED', 'CLOSED', 'EMERGENCY_ESCALATION');

-- CreateEnum
CREATE TYPE "ConsultationCompletionReason" AS ENUM ('COMPLETED', 'INTERRUPTED_TECHNICAL', 'INTERRUPTED_OTHER');

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "availabilityWindowId" TEXT NOT NULL,
    "consultationType" "ConsultationType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "reasonForVisit" TEXT,
    "rescheduledFromId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationSession" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "state" "ConsultationState" NOT NULL DEFAULT 'WAITING_ROOM',
    "completionReason" "ConsultationCompletionReason",
    "version" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionConnectionLog" (
    "id" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionConnectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_availabilityWindowId_idx" ON "Appointment"("availabilityWindowId");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationSession_appointmentId_key" ON "ConsultationSession"("appointmentId");

-- CreateIndex
CREATE INDEX "ConsultationSession_state_idx" ON "ConsultationSession"("state");

-- CreateIndex
CREATE INDEX "SessionConnectionLog_consultationSessionId_idx" ON "SessionConnectionLog"("consultationSessionId");

-- CreateIndex
CREATE INDEX "SessionConnectionLog_occurredAt_idx" ON "SessionConnectionLog"("occurredAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_availabilityWindowId_fkey" FOREIGN KEY ("availabilityWindowId") REFERENCES "AvailabilityWindow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationSession" ADD CONSTRAINT "ConsultationSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionConnectionLog" ADD CONSTRAINT "SessionConnectionLog_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
