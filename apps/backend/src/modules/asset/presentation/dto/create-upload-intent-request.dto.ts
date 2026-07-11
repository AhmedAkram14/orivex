import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

import { MediaAssetPurpose } from '../../domain/enums/media-asset-purpose.enum.js';

export class CreateUploadIntentRequestDto {
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsEnum(MediaAssetPurpose)
  purpose!: MediaAssetPurpose;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeEstimate?: number;
}
