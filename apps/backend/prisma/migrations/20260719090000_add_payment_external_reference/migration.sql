-- ORIVEX Roadmap 2.0 implementation program, Stage 1 (Payment Gateway --
-- Stripe): PaymentTransaction gains a nullable, unique gateway reference
-- (a Stripe PaymentIntent id) so an inbound webhook event or a doctor/
-- admin-initiated refund can be matched back to the exact transaction that
-- created it. Additive only -- every existing row gets NULL, which is
-- valid (no transaction created before this migration was ever charged
-- through a real gateway).

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN "externalReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_externalReference_key" ON "PaymentTransaction"("externalReference");
