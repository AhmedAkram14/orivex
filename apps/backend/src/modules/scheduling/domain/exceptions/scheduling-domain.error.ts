// Single exception type for this module's invariants (mirrors Notification/
// Trust/Doctor/Asset's simplification).
export class SchedulingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
