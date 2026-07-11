-- Sprint 12: AIModule's AISuggestion aggregate (docs/10-backend-
-- architecture.md's AIModule entry; docs/09-physical-database.md's
-- ai_suggestions table). promptVersionId has no FK -- ReferenceDataModule
-- doesn't exist yet.
--
-- PendingAISuggestionAcknowledgment is ClinicalModule's own read-model,
-- populated only by Clinical's event subscriber reacting to AIModule's
-- published events -- never by a synchronous query into AIModule
-- (docs/10-backend-architecture.md's hard "Clinical never depends on
-- AIModule" rule).

-- CreateEnum
CREATE TYPE "AISuggestionType" AS ENUM ('SOAP_DRAFT', 'PRESCRIPTION_DRAFT', 'INTERACTION_FLAG', 'SUGGESTED_QUESTION', 'SUMMARY', 'FOLLOW_UP_PLAN');

-- CreateEnum
CREATE TYPE "AISuggestionDecision" AS ENUM ('APPROVED', 'EDITED', 'REJECTED');

-- CreateTable
CREATE TABLE "AISuggestion" (
    "id" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "suggestionType" "AISuggestionType" NOT NULL,
    "content" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "safetyFlags" JSONB NOT NULL DEFAULT '[]',
    "requiresAcknowledgment" BOOLEAN NOT NULL DEFAULT false,
    "doctorDecision" "AISuggestionDecision",
    "decisionJustification" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AISuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAISuggestionAcknowledgment" (
    "suggestionId" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingAISuggestionAcknowledgment_pkey" PRIMARY KEY ("suggestionId")
);

-- CreateIndex
CREATE INDEX "AISuggestion_consultationSessionId_idx" ON "AISuggestion"("consultationSessionId");

-- CreateIndex
CREATE INDEX "PendingAISuggestionAcknowledgment_consultationSessionId_idx" ON "PendingAISuggestionAcknowledgment"("consultationSessionId");

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAISuggestionAcknowledgment" ADD CONSTRAINT "PendingAISuggestionAcknowledgment_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
