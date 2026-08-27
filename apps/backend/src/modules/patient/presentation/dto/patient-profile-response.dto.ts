import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { PatientProfile } from '../../domain/entities/patient-profile.entity.js';
import type { BloodType } from '../../domain/enums/blood-type.enum.js';

interface EmergencyContactView {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
}

// Composes PatientModule's own PatientProfile with IdentityModule's Account
// (fullName/email/phoneNumber/dateOfBirth/gender/address/nationality live on
// Account.userProfile, not duplicated here — module-to-module composition at
// the presentation layer, not a cross-module repository read, per
// docs/10-backend-architecture.md Section 11). Onboarding Redesign
// (2026-07-21 proposal §0a): dateOfBirth/gender/address/nationalityId moved
// here from PatientProfile's own former dateOfBirth field, now that Identity
// is the single owner of cross-role personal info. bloodType/allergies/
// chronicDiseases/insuranceProviderId (Stage O.3) are genuinely
// PatientProfile's own medical-profile fields, not composed from Account.
export class PatientProfileResponseDto {
  id!: string;
  accountId!: string;
  fullName!: string;
  email!: string;
  phoneNumber?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  nationalityId?: string;
  address?: string;
  bloodType?: BloodType;
  allergies?: string;
  chronicDiseases?: string;
  insuranceProviderId?: string;
  /** Resolved by the caller when it already has ReferenceModule's provider list loaded (e.g. the public patient chart); omitted (not fabricated) when no resolver is passed in. */
  insuranceProviderName?: string;
  emergencyContacts!: EmergencyContactView[];
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(profile: PatientProfile, account: Account, insuranceProviderName?: string): PatientProfileResponseDto {
    const userProfile = account.getUserProfile();
    const dto = new PatientProfileResponseDto();

    dto.id = profile.getId();
    dto.accountId = profile.getAccountId();
    dto.fullName = userProfile.getDisplayName().toString();
    dto.email = account.getEmail().toString();
    dto.phoneNumber = userProfile.getPhoneNumber();
    dto.avatarUrl = userProfile.getAvatarUrl();
    dto.dateOfBirth = userProfile.getDateOfBirth()?.toISOString();
    dto.gender = userProfile.getGender();
    dto.nationalityId = userProfile.getNationalityId();
    dto.address = userProfile.getAddress();
    dto.bloodType = profile.getBloodType();
    dto.allergies = profile.getAllergies();
    dto.chronicDiseases = profile.getChronicDiseases();
    dto.insuranceProviderId = profile.getInsuranceProviderId();
    dto.insuranceProviderName = insuranceProviderName;
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
