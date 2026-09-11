// Single exception type for this module's invariants (mirrors Consultation/
// Doctor/Messaging's own simplification).
export class WaitlistDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
