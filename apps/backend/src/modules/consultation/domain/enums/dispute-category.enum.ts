// Dispute System Hardening Phase 0: matches Dispute's real Prisma enum
// exactly (see DisputeStatus's own comment for the same convention).
export enum DisputeCategory {
  NoShow = 'no_show',
  PaymentRefund = 'payment_refund',
  Conduct = 'conduct',
  TechnicalIssue = 'technical_issue',
  Other = 'other',
}
