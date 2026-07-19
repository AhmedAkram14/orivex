import type { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';

export interface InitiateChargeCommandProps {
  idempotencyKey: string;
  consultationSessionId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  // A Stripe payment-method id (or equivalent), collected client-side via
  // Stripe Elements -- never a raw card number, which must never transit
  // this backend at all (PCI scope). Required by the real gateway adapter;
  // the not-configured adapter never reaches the point of needing it.
  paymentMethodToken: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style). idempotencyKey is
// client-supplied so a retried request (e.g. after a network timeout)
// replays the original outcome instead of charging twice.
export class InitiateChargeCommand {
  readonly idempotencyKey: string;
  readonly consultationSessionId: string;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: PaymentMethod;
  readonly paymentMethodToken: string;

  constructor(props: InitiateChargeCommandProps) {
    this.idempotencyKey = props.idempotencyKey;
    this.consultationSessionId = props.consultationSessionId;
    this.amount = props.amount;
    this.currency = props.currency;
    this.paymentMethod = props.paymentMethod;
    this.paymentMethodToken = props.paymentMethodToken;
  }
}
