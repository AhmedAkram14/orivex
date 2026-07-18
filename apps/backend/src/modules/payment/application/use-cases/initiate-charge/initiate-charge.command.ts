import type { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';

export interface InitiateChargeCommandProps {
  idempotencyKey: string;
  consultationSessionId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
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

  constructor(props: InitiateChargeCommandProps) {
    this.idempotencyKey = props.idempotencyKey;
    this.consultationSessionId = props.consultationSessionId;
    this.amount = props.amount;
    this.currency = props.currency;
    this.paymentMethod = props.paymentMethod;
  }
}
