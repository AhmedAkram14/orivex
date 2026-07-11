// Single exception type for this module's invariants (mirrors DoctorModule's
// simplification — no case here needs callers to distinguish failure modes
// programmatically beyond this one type).
export class AssetDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
