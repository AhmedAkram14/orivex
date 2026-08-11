-- Production incident fix: rows marked PAID with a stored feeAmount of 0
-- (a doctor's prior consultationFeeAmount was 0 or unset when the
-- Consultation Pricing Redesign backfill ran) crashed every read that
-- reconstructs their ConsultationPricing value object -- Money.create()
-- correctly rejects a non-positive amount as a write-time invariant, but
-- nothing had ever corrected these rows to match that invariant, so any
-- read of one threw and took down the entire response (patient dashboard,
-- appointments list, medical records, prescriptions -- everything that
-- touches an Appointment/AvailabilityWindow/WorkingHoursDay row transitively).
-- A "paid" slot/appointment with no positive fee on record isn't a real
-- price -- Free is the honest correction, not inventing a fee amount.

UPDATE "Appointment"
SET "consultationType" = 'FREE', "feeAmount" = NULL, "feeCurrency" = NULL
WHERE "consultationType" = 'PAID' AND "feeAmount" IS NOT NULL AND "feeAmount" <= 0;

UPDATE "AvailabilityWindow"
SET "consultationType" = 'FREE', "feeAmount" = NULL, "feeCurrency" = NULL
WHERE "consultationType" = 'PAID' AND "feeAmount" IS NOT NULL AND "feeAmount" <= 0;

UPDATE "WorkingHoursDay"
SET "pricingType" = 'FREE', "feeAmount" = NULL, "feeCurrency" = NULL
WHERE "pricingType" = 'PAID' AND "feeAmount" IS NOT NULL AND "feeAmount" <= 0;
