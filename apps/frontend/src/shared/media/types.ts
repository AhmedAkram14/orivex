/**
 * Matches AssetModule's real MediaAssetPurpose enum exactly. The 7
 * `national_id_front`...`professional_membership_card` values (Onboarding
 * Redesign, 2026-07-21 proposal, Stage O.3/O.6) are shared by Patient
 * identity verification and Doctor onboarding's redesigned Documents step
 * alike; `doctor_certificate` is kept only for backward compatibility with
 * already-submitted cases, not reused by the new flow.
 */
export type MediaAssetPurpose =
  | 'clinical_attachment'
  | 'doctor_certificate'
  | 'profile_image'
  | 'knowledge_media'
  | 'lab_report'
  | 'national_id_front'
  | 'national_id_back'
  | 'selfie_with_id'
  | 'medical_license'
  | 'graduation_certificate'
  | 'board_certificate'
  | 'professional_membership_card';

export type MediaAssetStatus = 'pending' | 'confirmed' | 'rejected';

/** Matches AssetModule's real MediaAssetResponseDto exactly. */
export interface MediaAsset {
  id: string;
  purpose: MediaAssetPurpose;
  contentType: string;
  status: MediaAssetStatus;
  signedUrl: string | null;
}
