// Matches the role-based model in docs/06-system-architecture.md's Security
// Architecture (RBAC baseline: Patient/Doctor/Admin). Role elevation (e.g. a
// verified doctor gaining doctor-role capabilities) is a future event-driven
// reaction owned by a later sprint — this enum only names the finite states.
export enum AccountRole {
  Patient = 'patient',
  Doctor = 'doctor',
  Admin = 'admin',
}
