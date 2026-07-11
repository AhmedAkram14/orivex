// Matches docs/12-openapi.md's PaymentTransaction.status enum exactly.
export enum PaymentStatus {
  Initiated = 'initiated',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Settled = 'settled',
  Refunded = 'refunded',
  Disputed = 'disputed',
}
