import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

import { CLINICAL_MEDIA_ASSET_PURPOSES, MediaAssetPurpose } from '../../../asset/domain/enums/media-asset-purpose.enum.js';

// Doctor Patient Chart plan, 4.2: mirrors AssetModule's own
// CreateUploadIntentRequestDto exactly, except `purpose` is restricted to
// the two clinical-document purposes (ClinicalAttachment/LabReport) --
// a doctor uploading to a patient's chart can never use this route to
// create, say, a ProfileImage or DoctorCertificate asset under the
// patient's account.
export class DoctorUploadPatientDocumentRequestDto {
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsIn(CLINICAL_MEDIA_ASSET_PURPOSES)
  purpose!: MediaAssetPurpose;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeEstimate?: number;
}
