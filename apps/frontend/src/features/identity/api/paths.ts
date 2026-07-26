// Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.6): the real backend
// route (IdentityModule's MyAccountController) -- the shared "Personal Info"
// step both Doctor Onboarding (Stage O.6) and the future Patient Profile
// Editor (Stage O.7) submit through, one endpoint, not duplicated per role.
export const IDENTITY_PATHS = {
  myAccount: '/accounts/me',
  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
  // real backend route (IdentityModule's AccountController), SuperAdmin-only
  // -- backs the admin verification case-detail page's "Applicant" section.
  byId: (id: string) => `/accounts/${id}`,
} as const;
