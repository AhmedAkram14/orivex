// Matches docs/12-openapi.md's MediaAsset schema exactly.
export enum MediaAssetPurpose {
  ClinicalAttachment = 'clinical_attachment',
  DoctorCertificate = 'doctor_certificate',
  ProfileImage = 'profile_image',
  KnowledgeMedia = 'knowledge_media',
  LabReport = 'lab_report',
  // Onboarding Redesign (2026-07-21 proposal, Stage O.3): 7 typed identity/
  // professional-document slots, shared by Patient identity verification
  // (National ID + selfie) and Doctor onboarding (all 7) alike -- additive,
  // DoctorCertificate is kept for backward compatibility with
  // already-submitted cases rather than repurposed.
  NationalIdFront = 'national_id_front',
  NationalIdBack = 'national_id_back',
  SelfieWithId = 'selfie_with_id',
  MedicalLicense = 'medical_license',
  GraduationCertificate = 'graduation_certificate',
  BoardCertificate = 'board_certificate',
  ProfessionalMembershipCard = 'professional_membership_card',
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.4): the subset of
// MediaAssetPurpose values RequiresIdentityVerification-style gating applies
// to -- a Patient's medical-record uploads, never their identity-verification
// documents (NationalId*/SelfieWithId, which exist precisely so an
// as-yet-unverified patient can submit them) or profile pictures.
export const CLINICAL_MEDIA_ASSET_PURPOSES: readonly MediaAssetPurpose[] = [
  MediaAssetPurpose.ClinicalAttachment,
  MediaAssetPurpose.LabReport,
];
