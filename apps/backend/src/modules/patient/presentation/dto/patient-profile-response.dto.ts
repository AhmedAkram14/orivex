import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { PatientProfile } from '../../domain/entities/patient-profile.entity.js';

interface EmergencyContactView {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
}

// Composes PatientModule's own PatientProfile with IdentityModule's Account
// (fullName/email/phoneNumber live on Account.userProfile, not duplicated
// here — module-to-module composition at the presentation layer, not a
// cross-module repository read, per docs/10-backend-architecture.md Section
// 11). Deliberately omits `gender`/`address`/`medicalInfo`: none of these
// are stored anywhere in the backend today (no field exists on Account or
// PatientProfile, and clinical data belongs to the not-yet-built
// ClinicalModule) -- returning them would be fabricated data, which this
// codebase's "no fake business logic" rule forbids. Adding real storage for
// address is real future work, not a silent omission.
export class PatientProfileResponseDto {
  id!: string;
  accountId!: string;
  fullName!: string;
  email!: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  emergencyContacts!: EmergencyContactView[];
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(profile: PatientProfile, account: Account): PatientProfileResponseDto {
    const userProfile = account.getUserProfile();
    const dto = new PatientProfileResponseDto();

    dto.id = profile.getId();
    dto.accountId = profile.getAccountId();
    dto.fullName = userProfile.getDisplayName().toString();
    dto.email = account.getEmail().toString();
    dto.phoneNumber = userProfile.getPhoneNumber();
    dto.dateOfBirth = profile.getDateOfBirth()?.toISOString();
    dto.emergencyContacts = profile.getEmergencyContacts().map((contact) => ({
      id: contact.getId(),
      name: contact.getName(),
      relationship: contact.getRelationship(),
      phoneNumber: contact.getPhoneNumber(),
    }));
    dto.createdAt = profile.getCreatedAt().toISOString();
    dto.updatedAt = profile.getUpdatedAt().toISOString();

    return dto;
  }
}
