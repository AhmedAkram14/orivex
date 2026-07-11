// Single exception type for this module's invariants (mirrors Doctor/Asset/
// Trust/Patient/Consultation/Clinical/Payment's simplification — no case
// here needs callers to distinguish failure modes programmatically beyond
// this one type, except the documented "already decided" 409 -- see
// AISuggestionAlreadyDecidedError).
export class AIDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
