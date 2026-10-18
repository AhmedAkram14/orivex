import { Controller, Get, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAdminOverviewUseCase } from '../../application/use-cases/get-admin-overview/get-admin-overview.use-case.js';
import { AdminOverviewResponseDto } from '../dto/admin-overview-response.dto.js';

// The admin Overview page's single aggregate read. Lives in ReportingModule
// beside ReportingController because every figure is one of its read-model
// queries; SuperAdmin-only and read-only, like every /admin/* route.
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.SuperAdmin)
export class AdminOverviewController {
  constructor(private readonly getAdminOverviewUseCase: GetAdminOverviewUseCase) {}

  @Get('overview')
  async getOverview(): Promise<ResponseEnvelope<AdminOverviewResponseDto>> {
    const result = await this.getAdminOverviewUseCase.execute();
    return envelope(AdminOverviewResponseDto.fromResult(result));
  }
}
