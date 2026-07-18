-- Production Readiness Audit finding: several foreign-key columns had no
-- index at all (Postgres does not auto-index FK columns), and the doctor
-- dashboard's "today's appointments" query pattern had no composite index
-- to back its (doctorId, scheduledAt) filter.

-- CreateIndex
CREATE INDEX "PortfolioPublication_doctorProfileId_idx" ON "PortfolioPublication"("doctorProfileId");

-- CreateIndex
CREATE INDEX "PortfolioAward_doctorProfileId_idx" ON "PortfolioAward"("doctorProfileId");

-- CreateIndex
CREATE INDEX "VerificationDocument_mediaAssetId_idx" ON "VerificationDocument"("mediaAssetId");

-- CreateIndex
CREATE INDEX "EmergencyContact_patientProfileId_idx" ON "EmergencyContact"("patientProfileId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_scheduledAt_idx" ON "Appointment"("doctorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_patientId_scheduledAt_idx" ON "Appointment"("patientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "HealthGraphNode_authoringDoctorId_idx" ON "HealthGraphNode"("authoringDoctorId");

-- CreateIndex
CREATE INDEX "HealthGraphNode_consultationSessionId_idx" ON "HealthGraphNode"("consultationSessionId");

-- CreateIndex
CREATE INDEX "HealthGraphNode_supersedesNodeId_idx" ON "HealthGraphNode"("supersedesNodeId");

-- CreateIndex
CREATE INDEX "HealthJourney_rootNodeId_idx" ON "HealthJourney"("rootNodeId");

-- CreateIndex
CREATE INDEX "ClinicalNote_authoringDoctorId_idx" ON "ClinicalNote"("authoringDoctorId");

-- CreateIndex
CREATE INDEX "ClinicalNote_addendumOfNoteId_idx" ON "ClinicalNote"("addendumOfNoteId");
