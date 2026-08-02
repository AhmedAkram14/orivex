-- Doctor Profile Redesign follow-up (2026-08-02): each work-experience entry
-- can carry the doctor's rank/degree at that position (e.g. "consultant"),
-- independent of DoctorProfile.professionalRank (their rank today), same
-- plain-string storage convention as that column.

-- AlterTable
ALTER TABLE "PortfolioWorkExperience" ADD COLUMN     "professionalRank" TEXT;
