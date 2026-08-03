import { Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetDoctorRatingAggregatesUseCase } from '../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ListAccountsUseCase } from '../identity/application/use-cases/list-accounts/list-accounts.use-case.js';

import {
  APPOINTMENT_ANALYTICS_QUERY,
  DOCTOR_ANALYTICS_QUERY,
  NOTIFICATION_ANALYTICS_QUERY,
  PATIENT_ANALYTICS_QUERY,
  PAYMENT_ANALYTICS_QUERY,
  TELEMEDICINE_ANALYTICS_QUERY,
  VERIFICATION_ANALYTICS_QUERY,
} from './application/ports/tokens.js';
import type { AppointmentAnalyticsQueryPort } from './application/ports/appointment-analytics-query.port.js';
import type { DoctorAnalyticsQueryPort } from './application/ports/doctor-analytics-query.port.js';
import type { NotificationAnalyticsQueryPort } from './application/ports/notification-analytics-query.port.js';
import type { PatientAnalyticsQueryPort } from './application/ports/patient-analytics-query.port.js';
import type { PaymentAnalyticsQueryPort } from './application/ports/payment-analytics-query.port.js';
import type { TelemedicineAnalyticsQueryPort } from './application/ports/telemedicine-analytics-query.port.js';
import type { VerificationAnalyticsQueryPort } from './application/ports/verification-analytics-query.port.js';
import { ExportReportCsvUseCase } from './application/use-cases/export-report-csv/export-report-csv.use-case.js';
import { GetAppointmentAnalyticsUseCase } from './application/use-cases/get-appointment-analytics/get-appointment-analytics.use-case.js';
import { GetDashboardKpisUseCase } from './application/use-cases/get-dashboard-kpis/get-dashboard-kpis.use-case.js';
import { GetDoctorAnalyticsUseCase } from './application/use-cases/get-doctor-analytics/get-doctor-analytics.use-case.js';
import { GetNotificationAnalyticsUseCase } from './application/use-cases/get-notification-analytics/get-notification-analytics.use-case.js';
import { GetPatientAnalyticsUseCase } from './application/use-cases/get-patient-analytics/get-patient-analytics.use-case.js';
import { GetPaymentAnalyticsUseCase } from './application/use-cases/get-payment-analytics/get-payment-analytics.use-case.js';
import { GetTelemedicineAnalyticsUseCase } from './application/use-cases/get-telemedicine-analytics/get-telemedicine-analytics.use-case.js';
import { GetVerificationAnalyticsUseCase } from './application/use-cases/get-verification-analytics/get-verification-analytics.use-case.js';
import { PrismaAppointmentAnalyticsQueryService } from './infrastructure/prisma/prisma-appointment-analytics-query.service.js';
import { PrismaDoctorAnalyticsQueryService } from './infrastructure/prisma/prisma-doctor-analytics-query.service.js';
import { PrismaNotificationAnalyticsQueryService } from './infrastructure/prisma/prisma-notification-analytics-query.service.js';
import { PrismaPatientAnalyticsQueryService } from './infrastructure/prisma/prisma-patient-analytics-query.service.js';
import { PrismaPaymentAnalyticsQueryService } from './infrastructure/prisma/prisma-payment-analytics-query.service.js';
import { PrismaTelemedicineAnalyticsQueryService } from './infrastructure/prisma/prisma-telemedicine-analytics-query.service.js';
import { PrismaVerificationAnalyticsQueryService } from './infrastructure/prisma/prisma-verification-analytics-query.service.js';
import { ReportingController } from './presentation/controllers/reporting.controller.js';

// Reporting & Analytics module (ORIVEX Roadmap 2.0's "Stage 9", the home
// GetPlatformKpisUseCase's own comment deferred appointment-count/revenue
// KPIs to). CQRS read-model only: no domain layer, no aggregate, no
// write-repo -- every query service queries Prisma directly for its own
// cross-cutting projections (mirrors DoctorModule's PrismaDoctorDirectory
// QueryService precedent), and the two places genuine reuse was possible
// (doctor ratings, doctor/patient role counts) go through ConsultationModule/
// IdentityModule's own exported use cases, never a re-derived calculation.
@Module({
  imports: [AuthenticationGuardsModule, IdentityModule, ConsultationModule],
  controllers: [ReportingController],
  providers: [
    { provide: APPOINTMENT_ANALYTICS_QUERY, useClass: PrismaAppointmentAnalyticsQueryService },
    { provide: DOCTOR_ANALYTICS_QUERY, useClass: PrismaDoctorAnalyticsQueryService },
    { provide: PATIENT_ANALYTICS_QUERY, useClass: PrismaPatientAnalyticsQueryService },
    { provide: PAYMENT_ANALYTICS_QUERY, useClass: PrismaPaymentAnalyticsQueryService },
    { provide: TELEMEDICINE_ANALYTICS_QUERY, useClass: PrismaTelemedicineAnalyticsQueryService },
    { provide: VERIFICATION_ANALYTICS_QUERY, useClass: PrismaVerificationAnalyticsQueryService },
    { provide: NOTIFICATION_ANALYTICS_QUERY, useClass: PrismaNotificationAnalyticsQueryService },
    {
      provide: GetAppointmentAnalyticsUseCase,
      useFactory: (port: AppointmentAnalyticsQueryPort) => new GetAppointmentAnalyticsUseCase(port),
      inject: [APPOINTMENT_ANALYTICS_QUERY],
    },
    {
      provide: GetDoctorAnalyticsUseCase,
      useFactory: (port: DoctorAnalyticsQueryPort, ratingsUseCase: GetDoctorRatingAggregatesUseCase) =>
        new GetDoctorAnalyticsUseCase(port, ratingsUseCase),
      inject: [DOCTOR_ANALYTICS_QUERY, GetDoctorRatingAggregatesUseCase],
    },
    {
      provide: GetPatientAnalyticsUseCase,
      useFactory: (port: PatientAnalyticsQueryPort) => new GetPatientAnalyticsUseCase(port),
      inject: [PATIENT_ANALYTICS_QUERY],
    },
    {
      provide: GetPaymentAnalyticsUseCase,
      useFactory: (port: PaymentAnalyticsQueryPort) => new GetPaymentAnalyticsUseCase(port),
      inject: [PAYMENT_ANALYTICS_QUERY],
    },
    {
      provide: GetTelemedicineAnalyticsUseCase,
      useFactory: (port: TelemedicineAnalyticsQueryPort) => new GetTelemedicineAnalyticsUseCase(port),
      inject: [TELEMEDICINE_ANALYTICS_QUERY],
    },
    {
      provide: GetVerificationAnalyticsUseCase,
      useFactory: (port: VerificationAnalyticsQueryPort) => new GetVerificationAnalyticsUseCase(port),
      inject: [VERIFICATION_ANALYTICS_QUERY],
    },
    {
      provide: GetNotificationAnalyticsUseCase,
      useFactory: (port: NotificationAnalyticsQueryPort) => new GetNotificationAnalyticsUseCase(port),
      inject: [NOTIFICATION_ANALYTICS_QUERY],
    },
    {
      provide: GetDashboardKpisUseCase,
      useFactory: (
        listAccountsUseCase: ListAccountsUseCase,
        verificationQuery: VerificationAnalyticsQueryPort,
        appointmentQuery: AppointmentAnalyticsQueryPort,
        telemedicineQuery: TelemedicineAnalyticsQueryPort,
        paymentQuery: PaymentAnalyticsQueryPort,
        patientQuery: PatientAnalyticsQueryPort,
        getDoctorAnalyticsUseCase: GetDoctorAnalyticsUseCase,
      ) =>
        new GetDashboardKpisUseCase(
          listAccountsUseCase,
          verificationQuery,
          appointmentQuery,
          telemedicineQuery,
          paymentQuery,
          patientQuery,
          getDoctorAnalyticsUseCase,
        ),
      inject: [
        ListAccountsUseCase,
        VERIFICATION_ANALYTICS_QUERY,
        APPOINTMENT_ANALYTICS_QUERY,
        TELEMEDICINE_ANALYTICS_QUERY,
        PAYMENT_ANALYTICS_QUERY,
        PATIENT_ANALYTICS_QUERY,
        GetDoctorAnalyticsUseCase,
      ],
    },
    {
      provide: ExportReportCsvUseCase,
      useFactory: (
        appointments: GetAppointmentAnalyticsUseCase,
        doctors: GetDoctorAnalyticsUseCase,
        patients: GetPatientAnalyticsUseCase,
        payments: GetPaymentAnalyticsUseCase,
        telemedicine: GetTelemedicineAnalyticsUseCase,
        verification: GetVerificationAnalyticsUseCase,
        notifications: GetNotificationAnalyticsUseCase,
      ) => new ExportReportCsvUseCase(appointments, doctors, patients, payments, telemedicine, verification, notifications),
      inject: [
        GetAppointmentAnalyticsUseCase,
        GetDoctorAnalyticsUseCase,
        GetPatientAnalyticsUseCase,
        GetPaymentAnalyticsUseCase,
        GetTelemedicineAnalyticsUseCase,
        GetVerificationAnalyticsUseCase,
        GetNotificationAnalyticsUseCase,
      ],
    },
  ],
})
export class ReportingModule {}
