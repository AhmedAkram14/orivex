import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
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
// doctors upload media (profile photos, verification documents). The asset
// itself now carries an ownerAccountId (Production Readiness Audit finding:
// confirm-upload previously had no ownership check at all, letting any
// authenticated caller mint a presigned download URL for someone else's
// asset by id).
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
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: CreateUploadIntentRequestDto,
  ): Promise<ResponseEnvelope<MediaAssetResponseDto>> {
    try {
      const { asset, signedUrl } = await this.createUploadIntentUseCase.execute(
        new CreateUploadIntentCommand({
          ownerAccountId: user.accountId,
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
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<MediaAssetResponseDto>> {
    try {
      const { asset, signedUrl } = await this.confirmUploadUseCase.execute(
        new ConfirmUploadCommand({ mediaAssetId: id, callerAccountId: user.accountId }),
      );
      return envelope(MediaAssetResponseDto.fromDomain(asset, signedUrl));
    } catch (error) {
      throw mapAssetError(error);
    }
  }
}
