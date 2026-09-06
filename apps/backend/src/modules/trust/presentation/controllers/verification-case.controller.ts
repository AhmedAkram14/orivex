import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { DecideVerificationCommand } from '../../application/use-cases/decide-verification/decide-verification.command.js';
import { DecideVerificationUseCase } from '../../application/use-cases/decide-verification/decide-verification.use-case.js';
import { RecordAuditLogCommand } from '../../application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { SuspendVerificationCaseCommand } from '../../application/use-cases/suspend-verification-case/suspend-verification-case.command.js';
import { SuspendVerificationCaseUseCase } from '../../application/use-cases/suspend-verification-case/suspend-verification-case.use-case.js';
import { AuditAction } from '../../domain/enums/audit-action.enum.js';
import { DecideVerificationRequestDto } from '../dto/decide-verification-request.dto.js';
import { SuspendVerificationRequestDto } from '../dto/suspend-verification-request.dto.js';
import { VerificationCaseResponseDto } from '../dto/verification-case-response.dto.js';
import { mapTrustError } from '../mappers/trust-exception.mapper.js';

// Matches docs/12-openapi.md's PATCH /verifications/{id} exactly.
// Approving/rejecting a doctor's license verification is an administrative
// action, gated to AccountRole.SuperAdmin (renamed from AccountRole.Admin in
// ORIVEX Roadmap 2.0 Stage 4 — see account-role.enum.ts's own comment).
//
// Audit trail gap fix (ORIVEX Remaining Work Audit, P0 C2): docs/01-prd.md
// L118 requires "every admin action on sensitive data ... audit-logged with
// actor, timestamp, and reason" -- both actions below now record one, only
// after the underlying use case succeeds (a failed decision never leaves an
// audit trail claiming it happened).
@Controller('verifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.SuperAdmin)
export class VerificationCaseController {
  constructor(
    private readonly decideVerificationUseCase: DecideVerificationUseCase,
    private readonly suspendVerificationCaseUseCase: SuspendVerificationCaseUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
  ) {}

  @Patch(':id')
  async decide(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideVerificationRequestDto,
  ): Promise<ResponseEnvelope<VerificationCaseResponseDto>> {
    try {
      const verificationCase = await this.decideVerificationUseCase.execute(
        new DecideVerificationCommand({
          verificationCaseId: id,
          status: body.status,
          reason: body.reason,
        }),
      );
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.DoctorVerificationDecided,
          subjectType: 'verification_case',
          subjectId: id,
          reason: body.reason,
          metadata: { status: body.status },
        }),
      );
      return envelope(VerificationCaseResponseDto.fromDomain(verificationCase));
    } catch (error) {
      throw mapTrustError(error);
    }
  }

  // Onboarding Redesign (2026-07-21 proposal, Stage O.2): revokes
  // previously-granted standing without losing the audit trail of ever
  // having been Approved -- a distinct transition from decide() above.
  @Patch(':id/suspend')
  async suspend(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SuspendVerificationRequestDto,
  ): Promise<ResponseEnvelope<VerificationCaseResponseDto>> {
    try {
      const verificationCase = await this.suspendVerificationCaseUseCase.execute(
        new SuspendVerificationCaseCommand({ verificationCaseId: id, reason: body.reason }),
      );
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.VerificationCaseSuspended,
          subjectType: 'verification_case',
          subjectId: id,
          reason: body.reason,
        }),
      );
      return envelope(VerificationCaseResponseDto.fromDomain(verificationCase));
    } catch (error) {
      throw mapTrustError(error);
    }
  }
}
