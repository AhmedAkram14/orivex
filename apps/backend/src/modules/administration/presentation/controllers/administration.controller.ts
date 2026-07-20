import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { ListAccountsQuery } from '../../../identity/application/use-cases/list-accounts/list-accounts.query.js';
import { ListAccountsUseCase } from '../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { UpdateAccountRoleCommand } from '../../../identity/application/use-cases/update-account-role/update-account-role.command.js';
import { UpdateAccountRoleUseCase } from '../../../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { AccountResponseDto } from '../../../identity/presentation/dto/account-response.dto.js';
import { mapIdentityError } from '../../../identity/presentation/mappers/identity-exception.mapper.js';
import { ListSecurityEventsForAccountUseCase } from '../../../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import type { CreateDepartmentCommand } from '../../application/use-cases/create-department/create-department.command.js';
import { CreateDepartmentUseCase } from '../../application/use-cases/create-department/create-department.use-case.js';
import { CreateHospitalCommand } from '../../application/use-cases/create-hospital/create-hospital.command.js';
import { CreateHospitalUseCase } from '../../application/use-cases/create-hospital/create-hospital.use-case.js';
import { GetPlatformKpisUseCase } from '../../application/use-cases/get-platform-kpis/get-platform-kpis.use-case.js';
import { GetVerificationReviewQueueUseCase } from '../../application/use-cases/get-verification-review-queue/get-verification-review-queue.use-case.js';
import { ListDepartmentsQuery } from '../../application/use-cases/list-departments/list-departments.query.js';
import { ListDepartmentsUseCase } from '../../application/use-cases/list-departments/list-departments.use-case.js';
import { ListHospitalsUseCase } from '../../application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { ReviewVerificationCaseCommand } from '../../application/use-cases/review-verification-case/review-verification-case.command.js';
import { ReviewVerificationCaseUseCase } from '../../application/use-cases/review-verification-case/review-verification-case.use-case.js';
import { VerificationCaseResponseDto } from '../../../trust/presentation/dto/verification-case-response.dto.js';
import { DecideVerificationRequestDto } from '../../../trust/presentation/dto/decide-verification-request.dto.js';
import { CreateDepartmentRequestDto } from '../dto/create-department-request.dto.js';
import { CreateHospitalRequestDto } from '../dto/create-hospital-request.dto.js';
import { DepartmentResponseDto } from '../dto/department-response.dto.js';
import { FeatureFlagsResponseDto } from '../dto/feature-flags-response.dto.js';
import { HospitalResponseDto } from '../dto/hospital-response.dto.js';
import { ListAccountsQueryDto } from '../dto/list-accounts-query.dto.js';
import { ListAccountsResponseDto } from '../dto/list-accounts-response.dto.js';
import { PlatformKpisResponseDto } from '../dto/platform-kpis-response.dto.js';
import { SecurityEventResponseDto } from '../dto/security-event-response.dto.js';
import { UpdateAccountRoleRequestDto } from '../dto/update-account-role-request.dto.js';
import { mapAdministrationError } from '../mappers/administration-exception.mapper.js';

// ORIVEX Roadmap 2.0 Stage 4: AdministrationModule's Admin Dashboard REST
// surface. Every route is gated to AccountRole.SuperAdmin -- the roadmap's
// HospitalAdmin role exists as an enum value but no route here scopes to a
// single hospital yet (a HospitalAdmin acting on "their own" hospital's
// accounts/departments is future work; this stage grants HospitalAdmin no
// additional access, so it stays SuperAdmin-only to avoid a false sense of
// scoped access that doesn't actually exist yet). See Stage 4's roadmap
// completion note's Limitations section.
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.SuperAdmin)
export class AdministrationController {
  constructor(
    private readonly listAccountsUseCase: ListAccountsUseCase,
    private readonly updateAccountRoleUseCase: UpdateAccountRoleUseCase,
    private readonly listHospitalsUseCase: ListHospitalsUseCase,
    private readonly createHospitalUseCase: CreateHospitalUseCase,
    private readonly listDepartmentsUseCase: ListDepartmentsUseCase,
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly getPlatformKpisUseCase: GetPlatformKpisUseCase,
    private readonly getVerificationReviewQueueUseCase: GetVerificationReviewQueueUseCase,
    private readonly reviewVerificationCaseUseCase: ReviewVerificationCaseUseCase,
    private readonly listSecurityEventsForAccountUseCase: ListSecurityEventsForAccountUseCase,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  @Get('kpis')
  async getKpis(): Promise<ResponseEnvelope<PlatformKpisResponseDto>> {
    const result = await this.getPlatformKpisUseCase.execute();
    return envelope(PlatformKpisResponseDto.fromResult(result));
  }

  @Get('accounts')
  async listAccounts(@Query() query: ListAccountsQueryDto): Promise<ResponseEnvelope<ListAccountsResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const result = await this.listAccountsUseCase.execute(new ListAccountsQuery({ page, limit, role: query.role }));
    return envelope(ListAccountsResponseDto.fromDomain(result, page, limit));
  }

  @Patch('accounts/:id/role')
  async updateAccountRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAccountRoleRequestDto,
  ): Promise<ResponseEnvelope<AccountResponseDto>> {
    try {
      const account = await this.updateAccountRoleUseCase.execute(
        new UpdateAccountRoleCommand({ accountId: id, newRole: body.role }),
      );
      return envelope(AccountResponseDto.fromDomain(account));
    } catch (error) {
      throw mapIdentityError(error);
    }
  }

  @Get('hospitals')
  async listHospitals(): Promise<ResponseEnvelope<HospitalResponseDto[]>> {
    const hospitals = await this.listHospitalsUseCase.execute();
    return envelope(hospitals.map((hospital) => HospitalResponseDto.fromDomain(hospital)));
  }

  @Post('hospitals')
  @HttpCode(HttpStatus.CREATED)
  async createHospital(@Body() body: CreateHospitalRequestDto): Promise<ResponseEnvelope<HospitalResponseDto>> {
    const hospital = await this.createHospitalUseCase.execute(
      new CreateHospitalCommand({ name: body.name, address: body.address }),
    );
    return envelope(HospitalResponseDto.fromDomain(hospital));
  }

  @Get('hospitals/:id/departments')
  async listDepartments(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<DepartmentResponseDto[]>> {
    try {
      const departments = await this.listDepartmentsUseCase.execute(new ListDepartmentsQuery({ hospitalId: id }));
      return envelope(departments.map((department) => DepartmentResponseDto.fromDomain(department)));
    } catch (error) {
      throw mapAdministrationError(error);
    }
  }

  @Post('hospitals/:id/departments')
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateDepartmentRequestDto,
  ): Promise<ResponseEnvelope<DepartmentResponseDto>> {
    try {
      const command: CreateDepartmentCommand = { hospitalId: id, name: body.name };
      const department = await this.createDepartmentUseCase.execute(command);
      return envelope(DepartmentResponseDto.fromDomain(department));
    } catch (error) {
      throw mapAdministrationError(error);
    }
  }

  // Real wiring for GetVerificationReviewQueueUseCase/ReviewVerificationCaseUseCase
  // -- both existed as internal, uncalled application services before Stage 4
  // (administration.module.ts's own pre-Stage-4 comment: "no controllers").
  // The pre-existing PATCH /verifications/{id} (VerificationCaseController)
  // still works unchanged for backward compatibility; these routes are the
  // first way to list the queue at all.
  @Get('verification-queue')
  async getVerificationQueue(): Promise<ResponseEnvelope<VerificationCaseResponseDto[]>> {
    const cases = await this.getVerificationReviewQueueUseCase.execute();
    return envelope(cases.map((verificationCase) => VerificationCaseResponseDto.fromDomain(verificationCase)));
  }

  @Patch('verification-queue/:id')
  async reviewVerificationCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideVerificationRequestDto,
  ): Promise<ResponseEnvelope<VerificationCaseResponseDto>> {
    const verificationCase = await this.reviewVerificationCaseUseCase.execute(
      new ReviewVerificationCaseCommand({ verificationCaseId: id, status: body.status, reason: body.reason }),
    );
    return envelope(VerificationCaseResponseDto.fromDomain(verificationCase));
  }

  // Per-account audit-log lookup, not a global cross-account feed -- see
  // GetPlatformKpisUseCase-adjacent limitation note in Stage 4's roadmap
  // completion note for why a true unscoped audit trail is deferred.
  @Get('accounts/:id/security-events')
  async getSecurityEventsForAccount(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<SecurityEventResponseDto[]>> {
    const events = await this.listSecurityEventsForAccountUseCase.execute({ accountId: id });
    return envelope(events.map((event) => SecurityEventResponseDto.fromDomain(event)));
  }

  @Get('feature-flags')
  getFeatureFlags(): ResponseEnvelope<FeatureFlagsResponseDto> {
    const dto = new FeatureFlagsResponseDto();
    dto.observabilityEnabled = this.configService.get('OTEL_ENABLED', { infer: true });
    dto.openApiEnabled = this.configService.get('OPENAPI_ENABLED', { infer: true });
    dto.paymentGatewayConfigured = Boolean(this.configService.get('STRIPE_SECRET_KEY', { infer: true }));
    dto.telemedicineConfigured = Boolean(this.configService.get('LIVEKIT_URL', { infer: true }));
    dto.emailProviderConfigured = Boolean(this.configService.get('SENDGRID_API_KEY', { infer: true }));
    dto.notificationQueueConfigured = Boolean(this.configService.get('REDIS_URL', { infer: true }));
    return envelope(dto);
  }
}
