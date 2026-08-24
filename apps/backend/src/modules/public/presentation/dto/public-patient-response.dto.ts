import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';

// Deliberately minimal -- this is the ONLY patient-facing endpoint reachable
// without authentication (see PatientProfileController's own header comment:
// every other patient read is "scoped to the caller only... since a profile
// carries account-level PII"). Carries just enough to identify who left a
// public review: no blood type, allergies, chronic diseases, insurance,
// emergency contacts, address, or date of birth -- none of that leaves this
// module's private surface.
export class PublicPatientResponseDto {
  patientProfileId!: string;
  fullName!: string;
  avatarUrl?: string;

  static fromDomain(profile: PatientProfile, account: Account): PublicPatientResponseDto {
    const dto = new PublicPatientResponseDto();
    dto.patientProfileId = profile.getId();
    dto.fullName = account.getUserProfile().getDisplayName().toString();
    dto.avatarUrl = account.getUserProfile().getAvatarUrl();
    return dto;
  }
}
