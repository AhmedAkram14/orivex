// Base exception type for this module's invariants (mirrors Doctor/Asset/
// Trust/Patient/Consultation/Payment's simplification). K10's
// DuplicateWearableVitalReadingError is the one case here that does need to
// be distinguished programmatically -- see that file's own comment.
export class ClinicalDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
