export type StripeWebhookOutcome = 'succeeded' | 'failed' | 'refunded';

export interface ReconcileStripeWebhookEventCommandProps {
  externalReference: string;
  outcome: StripeWebhookOutcome;
}

// ORIVEX Roadmap 2.0 implementation program, Stage 1. InitiateChargeUseCase's
// flow is synchronous (StripePaymentGatewayAdapter.authorize() already
// resolves succeeded/failed before this ever fires), so this command is
// deliberately idempotent -- most webhook deliveries arrive after the
// transaction has already reached the matching terminal state and this
// becomes a no-op reconciliation, not a duplicate transition.
export class ReconcileStripeWebhookEventCommand {
  readonly externalReference: string;
  readonly outcome: StripeWebhookOutcome;

  constructor(props: ReconcileStripeWebhookEventCommandProps) {
    this.externalReference = props.externalReference;
    this.outcome = props.outcome;
  }
}
