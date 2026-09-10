import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetDisputeByIdUseCase } from '../../application/use-cases/get-dispute-by-id/get-dispute-by-id.use-case.js';
import { ListDisputesForCallerUseCase } from '../../application/use-cases/list-disputes-for-caller/list-disputes-for-caller.use-case.js';
import { RaiseDisputeCommand } from '../../application/use-cases/raise-dispute/raise-dispute.command.js';
import { RaiseDisputeUseCase } from '../../application/use-cases/raise-dispute/raise-dispute.use-case.js';
import { DisputeResponseDto } from '../dto/dispute-response.dto.js';
import { RaiseDisputeRequestDto } from '../dto/raise-dispute-request.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): either
// party on a real appointment can raise a dispute about it -- patient and
// doctor alike, same @Roles pairing as MessageThreadController. Reading
// back is scoped to "disputes I raised" (never another account's), never a
// distinguishing 403 on the single-resource read -- the same 404-not-403
// "never leak existence" convention this codebase uses everywhere else.
@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient, AccountRole.Doctor)
export class DisputeController {
  constructor(
    private readonly raiseDisputeUseCase: RaiseDisputeUseCase,
    private readonly listDisputesForCallerUseCase: ListDisputesForCallerUseCase,
    private readonly getDisputeByIdUseCase: GetDisputeByIdUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async raise(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: RaiseDisputeRequestDto,
  ): Promise<ResponseEnvelope<DisputeResponseDto>> {
    try {
      const dispute = await this.raiseDisputeUseCase.execute(
        new RaiseDisputeCommand({ appointmentId: body.appointmentId, callerAccountId: user.accountId, reason: body.reason }),
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
    if (!dispute || dispute.getRaisedByAccountId() !== user.accountId) {
      throw new NotFoundError(`Dispute "${id}" not found.`);
    }
    return envelope(DisputeResponseDto.fromDomain(dispute));
  }
}
