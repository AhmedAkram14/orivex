-- CreateTable
CREATE TABLE "ConsultationFeedback" (
    "id" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpRecommendation" (
    "id" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "authoringDoctorId" TEXT NOT NULL,
    "recommendedDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationFeedback_consultationSessionId_key" ON "ConsultationFeedback"("consultationSessionId");

-- CreateIndex
CREATE INDEX "ConsultationFeedback_doctorId_idx" ON "ConsultationFeedback"("doctorId");

-- CreateIndex
CREATE INDEX "ConsultationFeedback_patientId_idx" ON "ConsultationFeedback"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpRecommendation_consultationSessionId_key" ON "FollowUpRecommendation"("consultationSessionId");

-- CreateIndex
CREATE INDEX "FollowUpRecommendation_authoringDoctorId_idx" ON "FollowUpRecommendation"("authoringDoctorId");

-- AddForeignKey
ALTER TABLE "ConsultationFeedback" ADD CONSTRAINT "ConsultationFeedback_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationFeedback" ADD CONSTRAINT "ConsultationFeedback_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationFeedback" ADD CONSTRAINT "ConsultationFeedback_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Consultation lifecycle completion follow-up (2026-07-26): a database-level
-- invariant, not just application-side validation -- the rating range is a
-- real business rule ("1-5 stars"), and this table is exactly where a
-- future direct-SQL fix/import could otherwise slip an out-of-range value
-- past the application layer.
ALTER TABLE "ConsultationFeedback" ADD CONSTRAINT "ConsultationFeedback_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

-- AddForeignKey
ALTER TABLE "FollowUpRecommendation" ADD CONSTRAINT "FollowUpRecommendation_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpRecommendation" ADD CONSTRAINT "FollowUpRecommendation_authoringDoctorId_fkey" FOREIGN KEY ("authoringDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
