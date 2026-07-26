/** Matches Identity's real Gender enum exactly (a plain enum, not reference data -- fixed, small, never needs runtime extension). */
export type Gender = 'male' | 'female' | 'other';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.6): matches
 * MyAccountController's real GET /accounts/me AccountResponseDto exactly.
 * `dateOfBirth`/`gender`/`nationalityId`/`address` are the shared Personal
 * Info fields -- owned by Identity (Account/UserProfile), not duplicated
 * into Doctor or Patient.
 */
export interface Account {
  id: string;
  email: string;
  role: string;
  status: string;
  displayName: string;
  phoneNumber?: string;
  preferredLanguage: string;
  dateOfBirth?: string;
  gender?: Gender;
  nationalityId?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

/** Matches MyAccountController's real PATCH /accounts/me UpdatePersonalProfileRequestDto exactly -- all optional, a partial update. */
export interface UpdatePersonalProfileRequest {
  /** ISO date. */
  dateOfBirth?: string;
  gender?: Gender;
  nationalityId?: string;
  address?: string;
}
