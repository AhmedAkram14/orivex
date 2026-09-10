import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageRequestDto {
  @IsString()
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsUUID()
  attachmentAssetId?: string;
}
