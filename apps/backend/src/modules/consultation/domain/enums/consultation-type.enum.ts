// Matches docs/12-openapi.md's consultationType enum exactly. Deliberately
// its own copy, not imported from DoctorModule's identical enum -- domain
// layers never import across module boundaries (only application layers
// compose via exported use cases).
export enum ConsultationType {
  Free = 'free',
  Paid = 'paid',
}
