-- Sprint 2: DoctorModule (docs/10-backend-architecture.md's DoctorModule
-- entry: DoctorProfile, PortfolioPublication, PortfolioAward). Verification
-- status intentionally not modeled here — owned by TrustModule (Sprint 4).

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "biography" TEXT,
    "yearsOfExperience" INTEGER,
    "languages" TEXT[],
    "consultationFeeAmount" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioPublication" (
    "id" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reference" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioAward" (
    "id" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuingBody" TEXT,
    "awardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_accountId_key" ON "DoctorProfile"("accountId");

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPublication" ADD CONSTRAINT "PortfolioPublication_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAward" ADD CONSTRAINT "PortfolioAward_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
