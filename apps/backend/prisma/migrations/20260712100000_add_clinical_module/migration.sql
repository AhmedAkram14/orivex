-- Sprint 10: ClinicalModule (docs/10-backend-architecture.md's ClinicalModule
-- entry). HealthGraphEdge is deliberately not modeled -- no documented
-- endpoint or response schema exercises it. icd11_code_id is omitted --
-- ReferenceDataModule doesn't exist. derivedFromSuggestionId is not
-- stored -- AIModule doesn't exist.

-- CreateEnum
CREATE TYPE "HealthGraphNodeType" AS ENUM ('CONDITION', 'SYMPTOM', 'MEDICATION', 'LAB_RESULT', 'RADIOLOGY_RESULT');

-- CreateEnum
CREATE TYPE "CertaintyLevel" AS ENUM ('SUSPECTED', 'CONFIRMED', 'RULED_OUT');

-- CreateEnum
CREATE TYPE "NodeSource" AS ENUM ('CLINICAL', 'PATIENT_REPORTED', 'DEVICE');

-- CreateEnum
CREATE TYPE "JourneyStage" AS ENUM ('DIAGNOSIS', 'FOLLOW_UP', 'MONITORING', 'RESOLVED', 'ONGOING_CHRONIC', 'REFERRED_OUT');

-- CreateTable
CREATE TABLE "HealthGraph" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthGraphNode" (
    "id" TEXT NOT NULL,
    "healthGraphId" TEXT NOT NULL,
    "nodeType" "HealthGraphNodeType" NOT NULL,
    "freeTextDescription" TEXT,
    "certaintyLevel" "CertaintyLevel" NOT NULL DEFAULT 'SUSPECTED',
    "source" "NodeSource" NOT NULL DEFAULT 'CLINICAL',
    "authoringDoctorId" TEXT,
    "consultationSessionId" TEXT,
    "supersedesNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthGraphNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthJourney" (
    "id" TEXT NOT NULL,
    "healthGraphId" TEXT NOT NULL,
    "rootNodeId" TEXT NOT NULL,
    "stage" "JourneyStage" NOT NULL DEFAULT 'DIAGNOSIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyNodeLink" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,

    CONSTRAINT "JourneyNodeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "authoringDoctorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "addendumOfNoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthGraph_patientId_key" ON "HealthGraph"("patientId");

-- CreateIndex
CREATE INDEX "HealthGraphNode_healthGraphId_idx" ON "HealthGraphNode"("healthGraphId");

-- CreateIndex
CREATE INDEX "HealthGraphNode_nodeType_idx" ON "HealthGraphNode"("nodeType");

-- CreateIndex
CREATE INDEX "HealthJourney_healthGraphId_idx" ON "HealthJourney"("healthGraphId");

-- CreateIndex
CREATE INDEX "HealthJourney_stage_idx" ON "HealthJourney"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyNodeLink_journeyId_nodeId_key" ON "JourneyNodeLink"("journeyId", "nodeId");

-- CreateIndex
CREATE INDEX "ClinicalNote_consultationSessionId_idx" ON "ClinicalNote"("consultationSessionId");

-- AddForeignKey
ALTER TABLE "HealthGraph" ADD CONSTRAINT "HealthGraph_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGraphNode" ADD CONSTRAINT "HealthGraphNode_healthGraphId_fkey" FOREIGN KEY ("healthGraphId") REFERENCES "HealthGraph"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGraphNode" ADD CONSTRAINT "HealthGraphNode_authoringDoctorId_fkey" FOREIGN KEY ("authoringDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGraphNode" ADD CONSTRAINT "HealthGraphNode_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGraphNode" ADD CONSTRAINT "HealthGraphNode_supersedesNodeId_fkey" FOREIGN KEY ("supersedesNodeId") REFERENCES "HealthGraphNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthJourney" ADD CONSTRAINT "HealthJourney_healthGraphId_fkey" FOREIGN KEY ("healthGraphId") REFERENCES "HealthGraph"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthJourney" ADD CONSTRAINT "HealthJourney_rootNodeId_fkey" FOREIGN KEY ("rootNodeId") REFERENCES "HealthGraphNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyNodeLink" ADD CONSTRAINT "JourneyNodeLink_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "HealthJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyNodeLink" ADD CONSTRAINT "JourneyNodeLink_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "HealthGraphNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authoringDoctorId_fkey" FOREIGN KEY ("authoringDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_addendumOfNoteId_fkey" FOREIGN KEY ("addendumOfNoteId") REFERENCES "ClinicalNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
