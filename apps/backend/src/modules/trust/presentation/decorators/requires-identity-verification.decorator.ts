import { SetMetadata } from '@nestjs/common';

export const REQUIRES_IDENTITY_VERIFICATION_KEY = 'requiresIdentityVerification';

// Onboarding Redesign (2026-07-21 proposal, Stage O.4): marks a route as
// requiring the caller's own Patient identity verification to be Approved.
// Mirrors @Roles()'s SetMetadata + Reflector shape exactly. Exported from
// TrustGuardsModule (not the full TrustModule) so any module can protect a
// route without pulling in TrustModule's DoctorModule/PatientModule/
// controller graph -- same reasoning as AuthenticationGuardsModule.
export const RequiresIdentityVerification = (): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRES_IDENTITY_VERIFICATION_KEY, true);
