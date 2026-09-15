import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { ConfirmUploadCommand } from '../../../asset/application/use-cases/confirm-upload/confirm-upload.command.js';
import { ConfirmUploadUseCase } from '../../../asset/application/use-cases/confirm-upload/confirm-upload.use-case.js';
import { CreateUploadIntentCommand } from '../../../asset/application/use-cases/create-upload-intent/create-upload-intent.command.js';
import { CreateUploadIntentUseCase } from '../../../asset/application/use-cases/create-upload-intent/create-upload-intent.use-case.js';
import { MediaAssetResponseDto } from '../../../asset/presentation/dto/media-asset-response.dto.js';
import { TreatingRelationshipService } from '../../../consultation/application/services/treating-relationship.service.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { RecordAuditLogCommand } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';
import { DoctorUploadPatientDocumentRequestDto } from '../dto/doctor-upload-patient-document-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Doctor Patient Chart plan, 4.2 (confirmed option b): a ClinicalModule
// wrapper over AssetModule's own upload-intent/confirm use cases, kept
// separate from DoctorPatientChartController (which stays GET-only/
// audit-only). MediaAssetController's own routes always set
// ownerAccountId/callerAccountId to the CALLING account -- a doctor could
// never use them as-is to add a document to a PATIENT's chart, only to
// their own. This controller closes that gap the deliberately narrow way:
// it resolves the patient's account server-side via the shared
// TreatingRelationshipService (never trusting a client-supplied patient
// account id) and passes THAT account id to AssetModule's use cases as the
// effective owner/caller -- AssetModule itself never learns "a doctor is
// uploading on a patient's behalf" as a concept; it only ever sees a call
// already authorized for that account.
@Controller('doctor/patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class DoctorPatientDocumentController {
  constructor(
    private readonly treatingRelationshipService: TreatingRelationshipService,
    private readonly createUploadIntentUseCase: CreateUploadIntentUseCase,
    private readonly confirmUploadUseCase: ConfirmUploadUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
  ) {}

  @Post(':id/documents/upload-intent')
  @HttpCode(HttpStatus.CREATED)
  async createUploadIntent(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
    @Body() body: DoctorUploadPatientDocumentRequestDto,
  ): Promise<ResponseEnvelope<MediaAssetResponseDto>> {
    try {
      const { profile } = await this.treatingRelationshipService.assertActiveRelationship(user.accountId, patientId);
      const { asset, signedUrl } = await this.createUploadIntentUseCase.execute(
        new CreateUploadIntentCommand({
          ownerAccountId: profile.getAccountId(),
          purpose: body.purpose,
          contentType: body.contentType,
          sizeEstimate: body.sizeEstimate,
        }),
      );
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.PatientChartDocumentUploadIntentCreated,
          subjectType: 'patient',
          subjectId: patientId,
          metadata: { mediaAssetId: asset.getId(), purpose: body.purpose },
        }),
      );
      return envelope(MediaAssetResponseDto.fromDomain(asset, signedUrl));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  @Post(':id/documents/:documentId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmUpload(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<ResponseEnvelope<MediaAssetResponseDto>> {
    try {
      const { profile } = await this.treatingRelationshipService.assertActiveRelationship(user.accountId, patientId);
      const { asset, signedUrl } = await this.confirmUploadUseCase.execute(
        new ConfirmUploadCommand({ mediaAssetId: documentId, callerAccountId: profile.getAccountId() }),
      );
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.PatientChartDocumentUploaded,
          subjectType: 'patient',
          subjectId: patientId,
          metadata: { mediaAssetId: asset.getId() },
        }),
      );
      return envelope(MediaAssetResponseDto.fromDomain(asset, signedUrl));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }
}
