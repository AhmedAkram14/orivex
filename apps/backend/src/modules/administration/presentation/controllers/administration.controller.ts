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
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { ListAccountsQuery } from '../../../identity/application/use-cases/list-accounts/list-accounts.query.js';
import { ListAccountsUseCase } from '../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { UpdateAccountRoleCommand } from '../../../identity/application/use-cases/update-account-role/update-account-role.command.js';
import { UpdateAccountRoleUseCase } from '../../../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { AccountResponseDto } from '../../../identity/presentation/dto/account-response.dto.js';
import { mapIdentityError } from '../../../identity/presentation/mappers/identity-exception.mapper.js';
import { ListArticlesByStatusQuery } from '../../../knowledge/application/use-cases/list-articles-by-status/list-articles-by-status.query.js';
import { ListArticlesByStatusUseCase } from '../../../knowledge/application/use-cases/list-articles-by-status/list-articles-by-status.use-case.js';
import { ModerateArticleCommand } from '../../../knowledge/application/use-cases/moderate-article/moderate-article.command.js';
import { ModerateArticleUseCase } from '../../../knowledge/application/use-cases/moderate-article/moderate-article.use-case.js';
import { KnowledgeArticleStatus } from '../../../knowledge/domain/enums/knowledge-article-status.enum.js';
import { KnowledgeArticleResponseDto } from '../../../knowledge/presentation/dto/knowledge-article-response.dto.js';
import { mapKnowledgeError } from '../../../knowledge/presentation/mappers/knowledge-exception.mapper.js';
import { GetDisputeByIdUseCase } from '../../../consultation/application/use-cases/get-dispute-by-id/get-dispute-by-id.use-case.js';
import { ListDisputesByStatusQuery } from '../../../consultation/application/use-cases/list-disputes-by-status/list-disputes-by-status.query.js';
import { ListDisputesByStatusUseCase } from '../../../consultation/application/use-cases/list-disputes-by-status/list-disputes-by-status.use-case.js';
import { ResolveDisputeCommand } from '../../../consultation/application/use-cases/resolve-dispute/resolve-dispute.command.js';
import { ResolveDisputeUseCase } from '../../../consultation/application/use-cases/resolve-dispute/resolve-dispute.use-case.js';
import { DisputeResponseDto } from '../../../consultation/presentation/dto/dispute-response.dto.js';
import { DisputeStatus } from '../../../consultation/domain/enums/dispute-status.enum.js';
import { ListConsultationFeedbackByModerationStatusQuery } from '../../../consultation/application/use-cases/list-consultation-feedback-by-moderation-status/list-consultation-feedback-by-moderation-status.query.js';
import { ListConsultationFeedbackByModerationStatusUseCase } from '../../../consultation/application/use-cases/list-consultation-feedback-by-moderation-status/list-consultation-feedback-by-moderation-status.use-case.js';
import { ModerateConsultationFeedbackCommand } from '../../../consultation/application/use-cases/moderate-consultation-feedback/moderate-consultation-feedback.command.js';
import { ModerateConsultationFeedbackUseCase } from '../../../consultation/application/use-cases/moderate-consultation-feedback/moderate-consultation-feedback.use-case.js';
import { ConsultationFeedbackResponseDto } from '../../../consultation/presentation/dto/consultation-feedback-response.dto.js';
import { ModerateConsultationFeedbackRequestDto } from '../../../consultation/presentation/dto/moderate-consultation-feedback-request.dto.js';
import { mapConsultationError } from '../../../consultation/presentation/mappers/consultation-exception.mapper.js';
import { ReviewModerationStatus } from '../../../consultation/domain/enums/review-moderation-status.enum.js';
import { GetVerificationCaseByIdUseCase } from '../../../trust/application/use-cases/get-verification-case-by-id/get-verification-case-by-id.use-case.js';
import { ListAuditLogEntriesQuery } from '../../../trust/application/use-cases/list-audit-log-entries/list-audit-log-entries.query.js';
import { ListAuditLogEntriesUseCase } from '../../../trust/application/use-cases/list-audit-log-entries/list-audit-log-entries.use-case.js';
import { ListSecurityEventsForAccountUseCase } from '../../../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import { SuspendVerificationCaseCommand } from '../../../trust/application/use-cases/suspend-verification-case/suspend-verification-case.command.js';
import { SuspendVerificationCaseUseCase } from '../../../trust/application/use-cases/suspend-verification-case/suspend-verification-case.use-case.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';
import { RefundPaymentCommand } from '../../../payment/application/use-cases/refund-payment/refund-payment.command.js';
import { RefundPaymentUseCase } from '../../../payment/application/use-cases/refund-payment/refund-payment.use-case.js';
import { PaymentTransactionResponseDto } from '../../../payment/presentation/dto/payment-transaction-response.dto.js';
import { mapPaymentError } from '../../../payment/presentation/mappers/payment-exception.mapper.js';
import type { CreateDepartmentCommand } from '../../application/use-cases/create-department/create-department.command.js';
import { CreateDepartmentUseCase } from '../../application/use-cases/create-department/create-department.use-case.js';
import { CreateHospitalCommand } from '../../application/use-cases/create-hospital/create-hospital.command.js';
import { CreateHospitalUseCase } from '../../application/use-cases/create-hospital/create-hospital.use-case.js';
import { GetPlatformKpisUseCase } from '../../application/use-cases/get-platform-kpis/get-platform-kpis.use-case.js';
import { GetVerificationHistoryUseCase } from '../../application/use-cases/get-verification-history/get-verification-history.use-case.js';
import { GetVerificationReviewQueueUseCase } from '../../application/use-cases/get-verification-review-queue/get-verification-review-queue.use-case.js';
import { ListDepartmentsQuery } from '../../application/use-cases/list-departments/list-departments.query.js';
import { ListDepartmentsUseCase } from '../../application/use-cases/list-departments/list-departments.use-case.js';
import { ListHospitalsUseCase } from '../../application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { ListPaymentTransactionsForAdminQuery } from '../../application/use-cases/list-payment-transactions-for-admin/list-payment-transactions-for-admin.query.js';
import { ListPaymentTransactionsForAdminUseCase } from '../../application/use-cases/list-payment-transactions-for-admin/list-payment-transactions-for-admin.use-case.js';
import { ReviewVerificationCaseCommand } from '../../application/use-cases/review-verification-case/review-verification-case.command.js';
import { ReviewVerificationCaseUseCase } from '../../application/use-cases/review-verification-case/review-verification-case.use-case.js';
import { DecideVerificationRequestDto } from '../../../trust/presentation/dto/decide-verification-request.dto.js';
import { SuspendVerificationRequestDto } from '../../../trust/presentation/dto/suspend-verification-request.dto.js';
import { mapTrustError } from '../../../trust/presentation/mappers/trust-exception.mapper.js';
import { AdminVerificationCaseResponseDto } from '../dto/admin-verification-case-response.dto.js';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto.js';
import { CreateDepartmentRequestDto } from '../dto/create-department-request.dto.js';
import { CreateHospitalRequestDto } from '../dto/create-hospital-request.dto.js';
import { DepartmentResponseDto } from '../dto/department-response.dto.js';
import { FeatureFlagsResponseDto } from '../dto/feature-flags-response.dto.js';
import { HospitalResponseDto } from '../dto/hospital-response.dto.js';
import { ListAccountsQueryDto } from '../dto/list-accounts-query.dto.js';
import { ListAccountsResponseDto } from '../dto/list-accounts-response.dto.js';
import { ListAdminPaymentTransactionsResponseDto } from '../dto/list-admin-payment-transactions-response.dto.js';
import { ListAuditLogResponseDto } from '../dto/list-audit-log-response.dto.js';
import { ListDisputesQueryDto } from '../dto/list-disputes-query.dto.js';
import { ListKnowledgeArticlesQueryDto } from '../dto/list-knowledge-articles-query.dto.js';
import { ModerateKnowledgeArticleRequestDto } from '../dto/moderate-knowledge-article-request.dto.js';
import { ListReviewsQueryDto } from '../dto/list-reviews-query.dto.js';
import { ResolveDisputeRequestDto } from '../dto/resolve-dispute-request.dto.js';
import { PlatformKpisResponseDto } from '../dto/platform-kpis-response.dto.js';
import { SecurityEventResponseDto } from '../dto/security-event-response.dto.js';
import { UpdateAccountRoleRequestDto } from '../dto/update-account-role-request.dto.js';
import { VerificationQueueQueryDto } from '../dto/verification-queue-query.dto.js';
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
    private readonly suspendVerificationCaseUseCase: SuspendVerificationCaseUseCase,
    private readonly getVerificationHistoryUseCase: GetVerificationHistoryUseCase,
    private readonly getVerificationCaseByIdUseCase: GetVerificationCaseByIdUseCase,
    private readonly listSecurityEventsForAccountUseCase: ListSecurityEventsForAccountUseCase,
    private readonly listPaymentTransactionsForAdminUseCase: ListPaymentTransactionsForAdminUseCase,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
    private readonly listAuditLogEntriesUseCase: ListAuditLogEntriesUseCase,
    private readonly listConsultationFeedbackByModerationStatusUseCase: ListConsultationFeedbackByModerationStatusUseCase,
    private readonly moderateConsultationFeedbackUseCase: ModerateConsultationFeedbackUseCase,
    private readonly listDisputesByStatusUseCase: ListDisputesByStatusUseCase,
    private readonly getDisputeByIdUseCase: GetDisputeByIdUseCase,
    private readonly resolveDisputeUseCase: ResolveDisputeUseCase,
    private readonly listArticlesByStatusUseCase: ListArticlesByStatusUseCase,
    private readonly moderateArticleUseCase: ModerateArticleUseCase,
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
  async getVerificationQueue(
    @Query() query: VerificationQueueQueryDto,
  ): Promise<ResponseEnvelope<AdminVerificationCaseResponseDto[]>> {
    const cases = await this.getVerificationReviewQueueUseCase.execute(query.subjectType, query.status);
    return envelope(cases.map((verificationCase) => AdminVerificationCaseResponseDto.fromDomain(verificationCase)));
  }

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): a
  // real case-detail read -- GetVerificationCaseByIdUseCase already existed
  // (backing getVerificationHistory below) but was never itself exposed as
  // its own route.
  @Get('verification-queue/:id')
  async getVerificationCase(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<AdminVerificationCaseResponseDto>> {
    const verificationCase = await this.getVerificationCaseByIdUseCase.execute(id);
    if (!verificationCase) {
      throw new NotFoundError(`VerificationCase "${id}" not found.`);
    }
    return envelope(AdminVerificationCaseResponseDto.fromDomain(verificationCase));
  }

  @Patch('verification-queue/:id')
  async reviewVerificationCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideVerificationRequestDto,
  ): Promise<ResponseEnvelope<AdminVerificationCaseResponseDto>> {
    const verificationCase = await this.reviewVerificationCaseUseCase.execute(
      new ReviewVerificationCaseCommand({ verificationCaseId: id, status: body.status, reason: body.reason }),
    );
    return envelope(AdminVerificationCaseResponseDto.fromDomain(verificationCase));
  }

  // Onboarding Redesign (2026-07-21 proposal, Stage O.2): revokes
  // previously-granted standing (license lapse, a compliance finding)
  // without losing the audit trail of ever having been Approved.
  @Patch('verification-queue/:id/suspend')
  async suspendVerificationCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SuspendVerificationRequestDto,
  ): Promise<ResponseEnvelope<AdminVerificationCaseResponseDto>> {
    try {
      const verificationCase = await this.suspendVerificationCaseUseCase.execute(
        new SuspendVerificationCaseCommand({ verificationCaseId: id, reason: body.reason }),
      );
      return envelope(AdminVerificationCaseResponseDto.fromDomain(verificationCase));
    } catch (error) {
      throw mapTrustError(error);
    }
  }

  // Onboarding Redesign (2026-07-21 proposal, Stage O.2): every past
  // VerificationCase for the same subject as the named case -- falls out of
  // the generalized subject model with no new domain logic.
  @Get('verification-queue/:id/history')
  async getVerificationHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<AdminVerificationCaseResponseDto[]>> {
    try {
      const cases = await this.getVerificationHistoryUseCase.execute({ verificationCaseId: id });
      return envelope(cases.map((verificationCase) => AdminVerificationCaseResponseDto.fromDomain(verificationCase)));
    } catch (error) {
      throw mapTrustError(error);
    }
  }

  // Authentication-only events for one account -- see /admin/audit-log
  // below for the real, cross-account PHI/clinical audit feed (I11).
  @Get('accounts/:id/security-events')
  async getSecurityEventsForAccount(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<SecurityEventResponseDto[]>> {
    const events = await this.listSecurityEventsForAccountUseCase.execute({ accountId: id });
    return envelope(events.map((event) => SecurityEventResponseDto.fromDomain(event)));
  }

  // I11 -- Admin audit-log viewer (ORIVEX Remaining Work Audit): the real,
  // global, cross-account feed AuditLogRepository's own comment named as
  // not-yet-built -- every PHI read and clinical/administrative write,
  // searchable by actor/subject/action, closing the release checklist's
  // "audit logging live on every PHI access path" requirement all the way
  // through to something a SuperAdmin can actually search.
  @Get('audit-log')
  async getAuditLog(@Query() query: AuditLogQueryDto): Promise<ResponseEnvelope<ListAuditLogResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const result = await this.listAuditLogEntriesUseCase.execute(
      new ListAuditLogEntriesQuery({
        page,
        limit,
        actorAccountId: query.actorAccountId,
        subjectType: query.subjectType,
        subjectId: query.subjectId,
        action: query.action,
      }),
    );
    return envelope(ListAuditLogResponseDto.fromResult(result, page, limit));
  }

  // ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4: SuperAdmin's
  // read path onto PaymentModule's transactions, extending the previously
  // read-only-analytics admin payment surface (GET /admin/analytics) with a
  // real per-transaction list. Mirrors listAccounts' page/limit ->
  // ListXxxResponseDto.fromResult(result, page, limit) shape exactly.
  @Get('payments')
  async listPayments(@Query() query: PaginationQueryDto): Promise<ResponseEnvelope<ListAdminPaymentTransactionsResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const result = await this.listPaymentTransactionsForAdminUseCase.execute(
      new ListPaymentTransactionsForAdminQuery({ page, limit }),
    );
    return envelope(ListAdminPaymentTransactionsResponseDto.fromResult(result, page, limit));
  }

  // SuperAdmin refund: calls the existing, unmodified RefundPaymentUseCase
  // directly -- no ownership check the way the doctor-facing POST
  // /payments/:id/refund requires, since SuperAdmin has platform-wide
  // authority (same rationale as reviewVerificationCase/suspendVerification-
  // Case above needing no per-hospital ownership check). Full-refund only;
  // there is no partial-refund concept anywhere in this domain.
  @Post('payments/:id/refund')
  @HttpCode(HttpStatus.OK)
  async refundPayment(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseEnvelope<PaymentTransactionResponseDto>> {
    try {
      const transaction = await this.refundPaymentUseCase.execute(new RefundPaymentCommand({ paymentTransactionId: id }));
      return envelope(PaymentTransactionResponseDto.fromDomain(transaction));
    } catch (error) {
      throw mapPaymentError(error);
    }
  }

  // I11 -- Admin content moderation (ORIVEX Remaining Work Audit): the
  // moderation queue -- defaults to Flagged (what an admin actually needs
  // to act on) when no status is given.
  @Get('reviews')
  async listReviews(@Query() query: ListReviewsQueryDto): Promise<ResponseEnvelope<ConsultationFeedbackResponseDto[]>> {
    const result = await this.listConsultationFeedbackByModerationStatusUseCase.execute(
      new ListConsultationFeedbackByModerationStatusQuery({
        status: query.status ?? ReviewModerationStatus.Flagged,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
      }),
    );
    return envelope(result.feedback.map((feedback) => ConsultationFeedbackResponseDto.fromDomain(feedback)));
  }

  @Patch('reviews/:id/moderate')
  async moderateReview(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ModerateConsultationFeedbackRequestDto,
  ): Promise<ResponseEnvelope<ConsultationFeedbackResponseDto>> {
    try {
      const feedback = await this.moderateConsultationFeedbackUseCase.execute(
        new ModerateConsultationFeedbackCommand({
          feedbackId: id,
          status: body.status,
          reason: body.reason,
          moderatorAccountId: user.accountId,
        }),
      );
      return envelope(ConsultationFeedbackResponseDto.fromDomain(feedback));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  // I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): defaults
  // to Open (what an admin actually needs to act on) when no status is
  // given.
  @Get('disputes')
  async listDisputes(@Query() query: ListDisputesQueryDto): Promise<ResponseEnvelope<DisputeResponseDto[]>> {
    const result = await this.listDisputesByStatusUseCase.execute(
      new ListDisputesByStatusQuery({
        status: query.status ?? DisputeStatus.Open,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
      }),
    );
    return envelope(result.disputes.map((dispute) => DisputeResponseDto.fromDomain(dispute)));
  }

  @Get('disputes/:id')
  async getDispute(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseEnvelope<DisputeResponseDto>> {
    const dispute = await this.getDisputeByIdUseCase.execute({ disputeId: id });
    if (!dispute) {
      throw new NotFoundError(`Dispute "${id}" not found.`);
    }
    return envelope(DisputeResponseDto.fromDomain(dispute));
  }

  @Patch('disputes/:id/resolve')
  async resolveDispute(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResolveDisputeRequestDto,
  ): Promise<ResponseEnvelope<DisputeResponseDto>> {
    try {
      const dispute = await this.resolveDisputeUseCase.execute(
        new ResolveDisputeCommand({
          disputeId: id,
          status: body.status,
          resolutionNotes: body.resolutionNotes,
          resolverAccountId: user.accountId,
        }),
      );
      return envelope(DisputeResponseDto.fromDomain(dispute));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  // I13 -- Knowledge Center (docs/01.1-prd-update.md §6): the content-
  // moderation queue -- defaults to PendingReview (what an admin actually
  // needs to act on) when no status is given. Same "seriousness as doctor
  // credential verification itself" the PRD's own business rule demands.
  @Get('knowledge/articles')
  async listKnowledgeArticles(
    @Query() query: ListKnowledgeArticlesQueryDto,
  ): Promise<ResponseEnvelope<KnowledgeArticleResponseDto[]>> {
    const result = await this.listArticlesByStatusUseCase.execute(
      new ListArticlesByStatusQuery({
        status: query.status ?? KnowledgeArticleStatus.PendingReview,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
      }),
    );
    return envelope(result.articles.map((article) => KnowledgeArticleResponseDto.fromDomain(article)));
  }

  @Patch('knowledge/articles/:id/moderate')
  async moderateKnowledgeArticle(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ModerateKnowledgeArticleRequestDto,
  ): Promise<ResponseEnvelope<KnowledgeArticleResponseDto>> {
    try {
      const article = await this.moderateArticleUseCase.execute(
        new ModerateArticleCommand({
          articleId: id,
          status: body.status,
          reason: body.reason,
          moderatorAccountId: user.accountId,
        }),
      );
      return envelope(KnowledgeArticleResponseDto.fromDomain(article));
    } catch (error) {
      throw mapKnowledgeError(error);
    }
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
