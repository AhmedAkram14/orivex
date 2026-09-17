import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { AppointmentPartyResolver } from '../../application/services/appointment-party-resolver.service.js';
import { GetAppointmentByIdUseCase } from '../../application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetDisputeByIdUseCase } from '../../application/use-cases/get-dispute-by-id/get-dispute-by-id.use-case.js';
import { ListDisputesForCallerUseCase } from '../../application/use-cases/list-disputes-for-caller/list-disputes-for-caller.use-case.js';
import { RaiseDisputeCommand } from '../../application/use-cases/raise-dispute/raise-dispute.command.js';
import { RaiseDisputeUseCase } from '../../application/use-cases/raise-dispute/raise-dispute.use-case.js';
import { WithdrawDisputeCommand } from '../../application/use-cases/withdraw-dispute/withdraw-dispute.command.js';
import { WithdrawDisputeUseCase } from '../../application/use-cases/withdraw-dispute/withdraw-dispute.use-case.js';
import { DisputeResponseDto } from '../dto/dispute-response.dto.js';
import { RaiseDisputeRequestDto } from '../dto/raise-dispute-request.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): either
// party on a real appointment can raise a dispute about it -- patient and
// doctor alike, same @Roles pairing as MessageThreadController.
//
// Dispute System Hardening Phase 1: visibility is fully bidirectional --
// reading back (both the list and the single-resource route) is scoped to
// every dispute where the caller is a genuine party to the underlying
// appointment, not just "disputes I raised". The single-resource route still
// never distinguishes a real dispute the caller isn't a party to from one
// that doesn't exist -- the same 404-not-403 "never leak existence"
// convention this codebase uses everywhere else.
@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient, AccountRole.Doctor)
export class DisputeController {
  constructor(
    private readonly raiseDisputeUseCase: RaiseDisputeUseCase,
    private readonly listDisputesForCallerUseCase: ListDisputesForCallerUseCase,
    private readonly getDisputeByIdUseCase: GetDisputeByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly appointmentPartyResolver: AppointmentPartyResolver,
    private readonly withdrawDisputeUseCase: WithdrawDisputeUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async raise(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: RaiseDisputeRequestDto,
  ): Promise<ResponseEnvelope<DisputeResponseDto>> {
    try {
      const dispute = await this.raiseDisputeUseCase.execute(
        new RaiseDisputeCommand({
          appointmentId: body.appointmentId,
          callerAccountId: user.accountId,
          reason: body.reason,
          category: body.category,
          attachmentAssetId: body.attachmentAssetId,
        }),
      );
      return envelope(DisputeResponseDto.fromDomain(dispute));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  @Get()
  async listMine(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<DisputeResponseDto[]>> {
    const disputes = await this.listDisputesForCallerUseCase.execute({ callerAccountId: user.accountId });
    return envelope(disputes.map((dispute) => DisputeResponseDto.fromDomain(dispute)));
  }

  @Get(':id')
  async getMine(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<DisputeResponseDto>> {
    const dispute = await this.getDisputeByIdUseCase.execute({ disputeId: id });
    if (!dispute) {
      throw new NotFoundError(`Dispute "${id}" not found.`);
    }

    // Dispute System Hardening Phase 1: caller may read this dispute if they
    // raised it OR if they're the counterparty on its underlying appointment
    // -- reuses the same party-resolution logic RaiseDisputeUseCase uses to
    // decide who may raise one in the first place, via
    // AppointmentPartyResolver, rather than a third inline copy.
    const isRaiser = dispute.getRaisedByAccountId() === user.accountId;
    if (!isRaiser) {
      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: dispute.getAppointmentId() });
      const isParty = appointment
        ? await this.appointmentPartyResolver.isAccountPartyToAppointment(appointment, user.accountId)
        : false;
      if (!isParty) {
        throw new NotFoundError(`Dispute "${id}" not found.`);
      }
    }

    return envelope(DisputeResponseDto.fromDomain(dispute));
  }

  // Dispute System Hardening Phase 1: the raiser retracting their own
  // dispute while it's still Open. Not a party-wide action -- only the
  // raiser may withdraw (see WithdrawDisputeUseCase's own 404-not-403
  // convention for a non-raiser caller).
  @Patch(':id/withdraw')
  async withdraw(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<DisputeResponseDto>> {
    try {
      const dispute = await this.withdrawDisputeUseCase.execute(
        new WithdrawDisputeCommand({ disputeId: id, callerAccountId: user.accountId }),
      );
      return envelope(DisputeResponseDto.fromDomain(dispute));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }
}
