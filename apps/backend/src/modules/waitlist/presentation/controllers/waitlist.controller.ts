import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { CancelWaitlistEntryCommand } from '../../application/use-cases/cancel-waitlist-entry/cancel-waitlist-entry.command.js';
import { CancelWaitlistEntryUseCase } from '../../application/use-cases/cancel-waitlist-entry/cancel-waitlist-entry.use-case.js';
import { JoinWaitlistCommand } from '../../application/use-cases/join-waitlist/join-waitlist.command.js';
import { JoinWaitlistUseCase } from '../../application/use-cases/join-waitlist/join-waitlist.use-case.js';
import { ListWaitlistEntriesForPatientUseCase } from '../../application/use-cases/list-waitlist-entries-for-patient/list-waitlist-entries-for-patient.use-case.js';
import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';
import { JoinWaitlistConsultationTypeDto, JoinWaitlistRequestDto } from '../dto/join-waitlist-request.dto.js';
import { WaitlistEntryResponseDto } from '../dto/waitlist-entry-response.dto.js';
import { mapWaitlistError } from '../mappers/waitlist-exception.mapper.js';

const DTO_TO_DOMAIN_CONSULTATION_TYPE: Record<JoinWaitlistConsultationTypeDto, ConsultationType> = {
  [JoinWaitlistConsultationTypeDto.Free]: ConsultationType.Free,
  [JoinWaitlistConsultationTypeDto.Paid]: ConsultationType.Paid,
};

// N8-Waitlist (ORIVEX Remaining Work Audit). Patient-only -- a doctor's
// legitimate waitlist visibility (if any) is a separate, undecided product
// question this scope doesn't answer; not exposing any endpoint here
// avoids guessing at it. Ownership of every entry is enforced inside the
// use cases themselves (defense-in-depth), this controller only resolves
// the caller's own account id from their JWT.
@Controller('waitlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient)
export class WaitlistController {
  constructor(
    private readonly joinWaitlistUseCase: JoinWaitlistUseCase,
    private readonly listWaitlistEntriesForPatientUseCase: ListWaitlistEntriesForPatientUseCase,
    private readonly cancelWaitlistEntryUseCase: CancelWaitlistEntryUseCase,
  ) {}

  @Get()
  async listMine(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<WaitlistEntryResponseDto[]>> {
    try {
      const entries = await this.listWaitlistEntriesForPatientUseCase.execute({ callerAccountId: user.accountId });
      return envelope(entries.map((entry) => WaitlistEntryResponseDto.fromDomain(entry)));
    } catch (error) {
      throw mapWaitlistError(error);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async join(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: JoinWaitlistRequestDto,
  ): Promise<ResponseEnvelope<WaitlistEntryResponseDto>> {
    try {
      const entry = await this.joinWaitlistUseCase.execute(
        new JoinWaitlistCommand({
          callerAccountId: user.accountId,
          doctorId: body.doctorId,
          consultationType: body.consultationType ? DTO_TO_DOMAIN_CONSULTATION_TYPE[body.consultationType] : undefined,
          earliestAcceptableAt: new Date(body.earliestAcceptableAt),
          latestAcceptableAt: new Date(body.latestAcceptableAt),
        }),
      );
      return envelope(WaitlistEntryResponseDto.fromDomain(entry));
    } catch (error) {
      throw mapWaitlistError(error);
    }
  }

  @Delete(':id')
  async cancel(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<WaitlistEntryResponseDto>> {
    try {
      const entry = await this.cancelWaitlistEntryUseCase.execute(
        new CancelWaitlistEntryCommand({ waitlistEntryId: id, callerAccountId: user.accountId }),
      );
      return envelope(WaitlistEntryResponseDto.fromDomain(entry));
    } catch (error) {
      throw mapWaitlistError(error);
    }
  }
}
