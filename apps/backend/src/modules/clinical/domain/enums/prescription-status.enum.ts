// Matches docs/12-openapi.md's PrescriptionSummary.status enum exactly.
export enum PrescriptionStatus {
  Draft = 'draft',
  Signed = 'signed',
  Active = 'active',
  Expired = 'expired',
  Superseded = 'superseded',
}
