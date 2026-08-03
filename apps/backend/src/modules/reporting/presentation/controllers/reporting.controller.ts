import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAppointmentAnalyticsUseCase } from '../../application/use-cases/get-appointment-analytics/get-appointment-analytics.use-case.js';
import { GetDashboardKpisUseCase } from '../../application/use-cases/get-dashboard-kpis/get-dashboard-kpis.use-case.js';
import { GetDoctorAnalyticsUseCase } from '../../application/use-cases/get-doctor-analytics/get-doctor-analytics.use-case.js';
import { GetNotificationAnalyticsUseCase } from '../../application/use-cases/get-notification-analytics/get-notification-analytics.use-case.js';
import { GetPatientAnalyticsUseCase } from '../../application/use-cases/get-patient-analytics/get-patient-analytics.use-case.js';
import { GetPaymentAnalyticsUseCase } from '../../application/use-cases/get-payment-analytics/get-payment-analytics.use-case.js';
import { GetTelemedicineAnalyticsUseCase } from '../../application/use-cases/get-telemedicine-analytics/get-telemedicine-analytics.use-case.js';
import { GetVerificationAnalyticsUseCase } from '../../application/use-cases/get-verification-analytics/get-verification-analytics.use-case.js';
import { ExportReportCsvUseCase } from '../../application/use-cases/export-report-csv/export-report-csv.use-case.js';
import { AppointmentAnalyticsResponseDto } from '../dto/appointment-analytics-response.dto.js';
import { DashboardKpisResponseDto } from '../dto/dashboard-kpis-response.dto.js';
import { DoctorAnalyticsResponseDto } from '../dto/doctor-analytics-response.dto.js';
import { NotificationAnalyticsResponseDto } from '../dto/notification-analytics-response.dto.js';
import { PatientAnalyticsResponseDto } from '../dto/patient-analytics-response.dto.js';
import { PaymentAnalyticsResponseDto } from '../dto/payment-analytics-response.dto.js';
import {
  AppointmentAnalyticsQueryDto,
  DoctorAnalyticsQueryDto,
  ExportReportQueryDto,
  ReportFilterQueryDto,
} from '../dto/report-filter-query.dto.js';
import { TelemedicineAnalyticsResponseDto } from '../dto/telemedicine-analytics-response.dto.js';
import { VerificationAnalyticsResponseDto } from '../dto/verification-analytics-response.dto.js';

// ORIVEX Roadmap 2.0 -- Reporting & Analytics module (the "Stage 9" home
// GetPlatformKpisUseCase's own comment deferred appointment-count/revenue
// KPIs to). Every route is SuperAdmin-only, same gate as every other
// /admin/* route in AdministrationController. Read-only throughout -- no
// route here ever mutates a clinical record or any other aggregate.
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.SuperAdmin)
export class ReportingController {
  constructor(
    private readonly getDashboardKpisUseCase: GetDashboardKpisUseCase,
    private readonly getAppointmentAnalyticsUseCase: GetAppointmentAnalyticsUseCase,
    private readonly getDoctorAnalyticsUseCase: GetDoctorAnalyticsUseCase,
    private readonly getPatientAnalyticsUseCase: GetPatientAnalyticsUseCase,
    private readonly getPaymentAnalyticsUseCase: GetPaymentAnalyticsUseCase,
    private readonly getTelemedicineAnalyticsUseCase: GetTelemedicineAnalyticsUseCase,
    private readonly getVerificationAnalyticsUseCase: GetVerificationAnalyticsUseCase,
    private readonly getNotificationAnalyticsUseCase: GetNotificationAnalyticsUseCase,
    private readonly exportReportCsvUseCase: ExportReportCsvUseCase,
  ) {}

  @Get('kpis')
  async getKpis(@Query() query: ReportFilterQueryDto): Promise<ResponseEnvelope<DashboardKpisResponseDto>> {
    const result = await this.getDashboardKpisUseCase.execute(query.toFilter());
    return envelope(DashboardKpisResponseDto.fromResult(result));
  }

  @Get('appointments')
  async getAppointmentAnalytics(
    @Query() query: AppointmentAnalyticsQueryDto,
  ): Promise<ResponseEnvelope<AppointmentAnalyticsResponseDto>> {
    const result = await this.getAppointmentAnalyticsUseCase.execute(query.toFilter(), query.bucket ?? 'day');
    return envelope(AppointmentAnalyticsResponseDto.fromResult(result));
  }

  @Get('doctors')
  async getDoctorAnalytics(@Query() query: DoctorAnalyticsQueryDto): Promise<ResponseEnvelope<DoctorAnalyticsResponseDto>> {
    const result = await this.getDoctorAnalyticsUseCase.execute(query.toFilter(), { sortBy: query.sortBy, limit: query.limit });
    return envelope(DoctorAnalyticsResponseDto.fromResult(result));
  }

  @Get('patients')
  async getPatientAnalytics(@Query() query: ReportFilterQueryDto): Promise<ResponseEnvelope<PatientAnalyticsResponseDto>> {
    const result = await this.getPatientAnalyticsUseCase.execute(query.toFilter());
    return envelope(PatientAnalyticsResponseDto.fromResult(result));
  }

  @Get('payments')
  async getPaymentAnalytics(@Query() query: ReportFilterQueryDto): Promise<ResponseEnvelope<PaymentAnalyticsResponseDto>> {
    const filter = query.toFilter();
    const result = await this.getPaymentAnalyticsUseCase.execute(filter, filter.comparePrevious ?? false);
    return envelope(PaymentAnalyticsResponseDto.fromResult(result));
  }

  @Get('telemedicine')
  async getTelemedicineAnalytics(
    @Query() query: ReportFilterQueryDto,
  ): Promise<ResponseEnvelope<TelemedicineAnalyticsResponseDto>> {
    const result = await this.getTelemedicineAnalyticsUseCase.execute(query.toFilter());
    return envelope(TelemedicineAnalyticsResponseDto.fromResult(result));
  }

  @Get('verification')
  async getVerificationAnalytics(
    @Query() query: ReportFilterQueryDto,
  ): Promise<ResponseEnvelope<VerificationAnalyticsResponseDto>> {
    const result = await this.getVerificationAnalyticsUseCase.execute(query.toFilter());
    return envelope(VerificationAnalyticsResponseDto.fromResult(result));
  }

  @Get('notifications')
  async getNotificationAnalytics(
    @Query() query: ReportFilterQueryDto,
  ): Promise<ResponseEnvelope<NotificationAnalyticsResponseDto>> {
    const result = await this.getNotificationAnalyticsUseCase.execute(query.toFilter());
    return envelope(NotificationAnalyticsResponseDto.fromResult(result));
  }

  // Deliberately bypasses the { data, meta } envelope -- this is the one
  // route in the codebase whose response body is not JSON. No
  // StreamableFile precedent exists elsewhere in this repo; a plain string
  // return with an explicit Content-Type is the simplest correct option for
  // a body this small (a handful of KPI rows, never a multi-MB export).
  @Get('export')
  @Header('Content-Type', 'text/csv')
  async exportReport(@Query() query: ExportReportQueryDto, @Res({ passthrough: true }) res: Response): Promise<string> {
    res.setHeader('Content-Disposition', `attachment; filename="${query.report}-report.csv"`);
    return this.exportReportCsvUseCase.execute({ section: query.report, filter: query.toFilter() });
  }
}
