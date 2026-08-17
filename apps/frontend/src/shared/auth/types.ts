/**
 * Session/user shape this architecture is built against. The real backend
 * (AuthenticationModule, Sprint 15 — first-party, no external IdP) has
 * exactly one role per account; `roles` stays an array for this type's own
 * multi-role design (unrelated to any IdP), and the backend wraps its
 * single role in a one-element array to satisfy it.
 */
export type Role = 'super_admin' | 'hospital_admin' | 'doctor' | 'receptionist' | 'nurse' | 'patient';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  /** Root-relative path served by this app's own public/ folder (e.g. "/demo/avatars/doctor-01.png") -- never a MediaAsset presigned URL. Absent for a real user with no photo on record; falls back to the existing initials avatar automatically. */
  avatarUrl?: string;
}

export type AuthStatus = 'unauthenticated' | 'authenticated' | 'loading';

export interface AuthState {
  status: AuthStatus;
  user: AuthenticatedUser | null;
}
