import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { ConfirmUploadCommand } from '../../application/use-cases/confirm-upload/confirm-upload.command.js';
import { ConfirmUploadUseCase } from '../../application/use-cases/confirm-upload/confirm-upload.use-case.js';
import { CreateUploadIntentCommand } from '../../application/use-cases/create-upload-intent/create-upload-intent.command.js';
import { CreateUploadIntentUseCase } from '../../application/use-cases/create-upload-intent/create-upload-intent.use-case.js';
import { CreateUploadIntentRequestDto } from '../dto/create-upload-intent-request.dto.js';
import { MediaAssetResponseDto } from '../dto/media-asset-response.dto.js';
import { mapAssetError } from '../mappers/asset-exception.mapper.js';

// Matches docs/12-openapi.md's documented Media Assets contract exactly
// (paths, request/response shapes) — unlike Identity/Doctor, this contract
// was already fully specified and self-contained, no cross-module
// composition gap to work around.
//
// Guarded to any authenticated account (no @Roles) -- both patients and
// doctors upload media (profile photos, verification documents), and the
// asset itself carries no owner field yet to scope by role.
@Controller('media-assets')
@UseGuards(JwtAuthGuard)
export class MediaAssetController {
  constructor(
    private readonly createUploadIntentUseCase: CreateUploadIntentUseCase,
    private readonly confirmUploadUseCase: ConfirmUploadUseCase,
  ) {}

  @Post('upload-intent')
  @HttpCode(HttpStatus.CREATED)
  async createUploadIntent(
    @Body() body: CreateUploadIntentRequestDto,
  ): Promise<ResponseEnvelope<MediaAssetResponseDto>> {
    try {
      const { asset, signedUrl } = await this.createUploadIntentUseCase.execute(
        new CreateUploadIntentCommand({
          purpose: body.purpose,
          contentType: body.contentType,
          sizeEstimate: body.sizeEstimate,
        }),
      );
      return envelope(MediaAssetResponseDto.fromDomain(asset, signedUrl));
    } catch (error) {
      throw mapAssetError(error);
    }
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmUpload(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<MediaAssetResponseDto>> {
    try {
      const { asset, signedUrl } = await this.confirmUploadUseCase.execute(
        new ConfirmUploadCommand({ mediaAssetId: id }),
      );
      return envelope(MediaAssetResponseDto.fromDomain(asset, signedUrl));
    } catch (error) {
      throw mapAssetError(error);
    }
  }
}
