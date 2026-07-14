/**
 * Session/user shape this architecture is built against — modeled on what
 * a Keycloak-issued token will actually carry (roles claim, subject id),
 * per Section 1.1's binding technology decision. Nothing constructs a real
 * instance of these types yet; they exist so the eventual Keycloak
 * integration (Phase 4) is a matter of populating this shape, not
 * inventing it under time pressure.
 */
export type Role = 'super_admin' | 'hospital_admin' | 'doctor' | 'receptionist' | 'nurse' | 'patient';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
}

export type AuthStatus = 'unauthenticated' | 'authenticated' | 'loading';

export interface AuthState {
  status: AuthStatus;
  user: AuthenticatedUser | null;
}
