// Single exception type for this module's invariants — DoctorModule doesn't
// yet have a case (like Identity's AccountClosedError) where callers need to
// distinguish failure modes programmatically, so one type suffices.
export class DoctorDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
