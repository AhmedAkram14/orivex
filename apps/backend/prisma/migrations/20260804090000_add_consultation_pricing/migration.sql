-- Consultation Pricing Redesign: pricing moves from a single global
-- DoctorProfile.consultationFeeAmount to being owned by the slot
-- (AvailabilityWindow), snapshotted onto Appointment at booking time, with
-- a per-weekday default on WorkingHoursDay. All new columns are additive;
-- the existing `consultationType`/`ConsultationType` columns and enum are
-- unchanged and still the Free/Paid flag -- these are the fee amount/
-- currency that never had a per-slot home before. Backfilled from each
-- row's existing consultationType + the owning doctor's (only) prior fee
-- source, DoctorProfile.consultationFeeAmount, so no historical data is
-- lost. 'EGP' matches this codebase's existing hardcoded single-currency
-- default (EGYPT_V1_DEFAULT_CURRENCY).

-- AlterTable
ALTER TABLE "AvailabilityWindow" ADD COLUMN "feeAmount" DECIMAL(65,30),
                                  ADD COLUMN "feeCurrency" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "feeAmount" DECIMAL(65,30),
                           ADD COLUMN "feeCurrency" TEXT;

-- AlterTable
ALTER TABLE "WorkingHoursDay" ADD COLUMN "pricingType" "ConsultationType" NOT NULL DEFAULT 'FREE',
                               ADD COLUMN "feeAmount" DECIMAL(65,30),
                               ADD COLUMN "feeCurrency" TEXT;

-- Backfill: every existing PAID AvailabilityWindow/Appointment row gets its
-- owning doctor's (only) prior fee source as its own snapshot.
UPDATE "AvailabilityWindow" w
SET "feeAmount" = dp."consultationFeeAmount", "feeCurrency" = 'EGP'
FROM "DoctorProfile" dp
WHERE w."doctorId" = dp."id" AND w."consultationType" = 'PAID' AND dp."consultationFeeAmount" IS NOT NULL;

UPDATE "Appointment" a
SET "feeAmount" = dp."consultationFeeAmount", "feeCurrency" = 'EGP'
FROM "DoctorProfile" dp
WHERE a."doctorId" = dp."id" AND a."consultationType" = 'PAID' AND dp."consultationFeeAmount" IS NOT NULL;

-- Backfill: every doctor's 7 WorkingHoursDay rows inherit their prior
-- global fee as the new per-weekday default (identical for all 7 days --
-- this is exactly what "one global fee" meant before this redesign).
UPDATE "WorkingHoursDay" whd
SET "pricingType" = 'PAID', "feeAmount" = dp."consultationFeeAmount", "feeCurrency" = 'EGP'
FROM "DoctorProfile" dp
WHERE whd."doctorId" = dp."id" AND dp."consultationFeeAmount" IS NOT NULL;
