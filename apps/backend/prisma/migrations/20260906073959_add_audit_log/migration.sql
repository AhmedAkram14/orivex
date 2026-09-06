-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('HEALTH_GRAPH_READ', 'HEALTH_JOURNEYS_READ', 'PATIENT_CHART_PROFILE_READ', 'PATIENT_CHART_APPOINTMENTS_READ', 'PATIENT_CHART_MEDICAL_RECORDS_READ', 'PATIENT_CHART_PRESCRIPTIONS_READ', 'PATIENT_CHART_DOCUMENTS_READ', 'CLINICAL_NOTE_RECORDED', 'DIAGNOSIS_RECORDED', 'VITAL_READING_RECORDED', 'PRESCRIPTION_SIGNED', 'DOCTOR_VERIFICATION_DECIDED', 'VERIFICATION_CASE_SUSPENDED');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorAccountId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_actorAccountId_idx" ON "AuditLog"("actorAccountId");

-- CreateIndex
CREATE INDEX "AuditLog_subjectType_subjectId_idx" ON "AuditLog"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
