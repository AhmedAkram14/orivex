-- Production Readiness Audit finding: POST /payments had no idempotency
-- protection -- a client retry after a network timeout would create a
-- second PaymentTransaction and call the gateway a second time (a real
-- double-charge risk). Added as NOT NULL, not backfilled -- no real PSP
-- adapter has ever been bound (PAYMENT_GATEWAY resolves to
-- NotConfiguredPaymentGatewayAdapter, which always throws), so no
-- production charge has ever succeeded and there are no rows to backfill.

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN "idempotencyKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_idempotencyKey_key" ON "PaymentTransaction"("idempotencyKey");
