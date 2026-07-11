// Single exception type for this module's invariants (mirrors Doctor/Asset/
// Trust/Patient's simplification — no case here needs callers to
// distinguish failure modes programmatically beyond this one type).
export class ConsultationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
