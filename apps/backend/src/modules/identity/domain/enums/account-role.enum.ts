// ORIVEX Roadmap 2.0 Stage 4: grown from the original 3-value RBAC baseline
// (Patient/Doctor/Admin, docs/06-system-architecture.md's Security
// Architecture) to the roadmap's 6 named roles. `Admin` was renamed to
// `SuperAdmin` rather than kept alongside a new value — a one-time data
// migration (`prisma/migrations/.../rename_admin_to_super_admin`) updates any
// existing `Account.role = 'admin'` row to `'super_admin'`, and both
// pre-Stage-4 call sites that gated on `AccountRole.Admin`
// (`verification-case.controller.ts`, `account.controller.ts`) were updated
// to `AccountRole.SuperAdmin` — see Stage 4's roadmap completion note for the
// full list. `HospitalAdmin`/`Receptionist`/`Nurse` are genuinely new,
// unused by any pre-Stage-4 code path. Role elevation (e.g. a verified
// doctor gaining doctor-role capabilities) remains a future event-driven
// reaction — this enum only names the finite states.
export enum AccountRole {
  Patient = 'patient',
  Doctor = 'doctor',
  Nurse = 'nurse',
  Receptionist = 'receptionist',
  HospitalAdmin = 'hospital_admin',
  SuperAdmin = 'super_admin',
}
