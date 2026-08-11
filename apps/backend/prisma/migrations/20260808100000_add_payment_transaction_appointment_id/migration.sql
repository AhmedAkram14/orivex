-- Consultation Pricing Lifecycle Completion: PaymentTransaction now charges
-- against the Appointment directly (pay-then-confirm) rather than requiring
-- a pre-existing ConsultationSession, which closes a real gap where a Paid
-- appointment's charge could never be initiated at all (no code path ever
-- created a session before confirmation, and confirmation was gated on a
-- successful charge). Additive column; nullable so any pre-existing rows
-- remain valid. Backfilled via each row's own consultationSessionId, for
-- any historical row that already had one.

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN "appointmentId" TEXT;

-- Backfill: existing rows already reference a ConsultationSession, which
-- itself always references exactly one Appointment.
UPDATE "PaymentTransaction" pt
SET "appointmentId" = cs."appointmentId"
FROM "ConsultationSession" cs
WHERE pt."consultationSessionId" = cs."id";

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PaymentTransaction_appointmentId_idx" ON "PaymentTransaction"("appointmentId");
