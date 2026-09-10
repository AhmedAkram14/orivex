-- CreateEnum
CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "authoringDoctorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "moderationReason" TEXT,
    "moderatedByAccountId" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticleSave" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeArticleSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorFollow" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeArticle_authoringDoctorId_idx" ON "KnowledgeArticle"("authoringDoctorId");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_status_idx" ON "KnowledgeArticle"("status");

-- CreateIndex
CREATE INDEX "KnowledgeArticleSave_patientId_idx" ON "KnowledgeArticleSave"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticleSave_articleId_patientId_key" ON "KnowledgeArticleSave"("articleId", "patientId");

-- CreateIndex
CREATE INDEX "DoctorFollow_doctorId_idx" ON "DoctorFollow"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorFollow_patientId_doctorId_key" ON "DoctorFollow"("patientId", "doctorId");

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_authoringDoctorId_fkey" FOREIGN KEY ("authoringDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleSave" ADD CONSTRAINT "KnowledgeArticleSave_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleSave" ADD CONSTRAINT "KnowledgeArticleSave_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorFollow" ADD CONSTRAINT "DoctorFollow_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorFollow" ADD CONSTRAINT "DoctorFollow_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
