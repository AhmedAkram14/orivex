import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { ForbiddenError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { CheckIdentityVerificationStatusUseCase } from '../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VerificationSubjectType } from '../../../trust/domain/enums/verification-subject-type.enum.js';
import { ConfirmUploadCommand } from '../../application/use-cases/confirm-upload/confirm-upload.command.js';
import { ConfirmUploadUseCase } from '../../application/use-cases/confirm-upload/confirm-upload.use-case.js';
import { CreateUploadIntentCommand } from '../../application/use-cases/create-upload-intent/create-upload-intent.command.js';
import { CreateUploadIntentUseCase } from '../../application/use-cases/create-upload-intent/create-upload-intent.use-case.js';
import { GetMediaAssetCommand } from '../../application/use-cases/get-media-asset/get-media-asset.command.js';
import { GetMediaAssetUseCase } from '../../application/use-cases/get-media-asset/get-media-asset.use-case.js';
import { CLINICAL_MEDIA_ASSET_PURPOSES } from '../../domain/enums/media-asset-purpose.enum.js';
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
    private readonly getMediaAssetUseCase: GetMediaAssetUseCase,
    private readonly checkIdentityVerificationStatusUseCase: CheckIdentityVerificationStatusUseCase,
  ) {}

  @Post('upload-intent')
  @HttpCode(HttpStatus.CREATED)
  async createUploadIntent(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: CreateUploadIntentRequestDto,
  ): Promise<ResponseEnvelope<MediaAssetResponseDto>> {
    try {
      // Onboarding Redesign (2026-07-21 proposal, Stage O.4): gated only for
      // a Patient uploading a clinical document (medical records) -- never
      // for identity-verification documents themselves (NationalId*/
      // SelfieWithId exist so an as-yet-unverified patient can submit them)
      // or a Doctor's own uploads. Doesn't fit the generic
      // @RequiresIdentityVerification() guard shape since the decision
      // depends on the request body's own `purpose`, not just the route.
      if (user.role === AccountRole.Patient && CLINICAL_MEDIA_ASSET_PURPOSES.includes(body.purpose)) {
        const { isVerified } = await this.checkIdentityVerificationStatusUseCase.execute({
          subjectType: VerificationSubjectType.Patient,
          subjectAccountId: user.accountId,
        });
        if (!isVerified) {
          throw new ForbiddenError('Identity verification is required for this action.', 'IDENTITY_VERIFICATION_REQUIRED');
        }
      }
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

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
  // first read/download capability this controller has ever exposed --
  // needed so an admin reviewing a VerificationCase can actually open the
  // documents it references. Allowed for the asset's own owner too (not
  // admin-only), matching ConfirmUpload's existing ownership model.
  @Get(':id')
  async getMediaAsset(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<MediaAssetResponseDto>> {
    try {
      const { asset, signedUrl } = await this.getMediaAssetUseCase.execute(
        new GetMediaAssetCommand({
          mediaAssetId: id,
          callerAccountId: user.accountId,
          callerIsAdmin: user.role === AccountRole.SuperAdmin,
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
