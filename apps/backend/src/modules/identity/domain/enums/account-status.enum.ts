// Matches the lifecycle described in docs/07-domain-data-model.md's Identity
// & Access Domain: "Created at signup -> active -> suspended/closed."
export enum AccountStatus {
  Active = 'active',
  Suspended = 'suspended',
  Closed = 'closed',
}
