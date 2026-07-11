import type { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';

export interface InitiateChargeCommandProps {
  consultationSessionId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class InitiateChargeCommand {
  readonly consultationSessionId: string;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: PaymentMethod;

  constructor(props: InitiateChargeCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.amount = props.amount;
    this.currency = props.currency;
    this.paymentMethod = props.paymentMethod;
  }
}
