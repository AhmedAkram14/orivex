export interface RefundPaymentCommandProps {
  paymentTransactionId: string;
}

// ORIVEX Roadmap 2.0 implementation program, Stage 1: wires the domain's
// existing PaymentTransaction.refund() (previously never called from any
// use case) all the way through to the gateway.
export class RefundPaymentCommand {
  readonly paymentTransactionId: string;

  constructor(props: RefundPaymentCommandProps) {
    this.paymentTransactionId = props.paymentTransactionId;
  }
}
