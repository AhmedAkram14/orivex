/** Matches AssetModule's real MediaAssetPurpose enum exactly. */
export type MediaAssetPurpose =
  | 'clinical_attachment'
  | 'doctor_certificate'
  | 'profile_image'
  | 'knowledge_media'
  | 'lab_report';

export type MediaAssetStatus = 'pending' | 'confirmed' | 'rejected';

/** Matches AssetModule's real MediaAssetResponseDto exactly. */
export interface MediaAsset {
  id: string;
  purpose: MediaAssetPurpose;
  contentType: string;
  status: MediaAssetStatus;
  signedUrl: string | null;
}
