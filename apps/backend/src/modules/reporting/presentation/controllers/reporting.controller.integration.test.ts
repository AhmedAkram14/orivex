import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { ExportReportCsvUseCase } from '../../application/use-cases/export-report-csv/export-report-csv.use-case.js';
import { GetAppointmentAnalyticsUseCase } from '../../application/use-cases/get-appointment-analytics/get-appointment-analytics.use-case.js';
import { GetDashboardKpisUseCase } from '../../application/use-cases/get-dashboard-kpis/get-dashboard-kpis.use-case.js';
import { GetDoctorAnalyticsUseCase } from '../../application/use-cases/get-doctor-analytics/get-doctor-analytics.use-case.js';
import { GetNotificationAnalyticsUseCase } from '../../application/use-cases/get-notification-analytics/get-notification-analytics.use-case.js';
import { GetPatientAnalyticsUseCase } from '../../application/use-cases/get-patient-analytics/get-patient-analytics.use-case.js';
import { GetPaymentAnalyticsUseCase } from '../../application/use-cases/get-payment-analytics/get-payment-analytics.use-case.js';
import { GetTelemedicineAnalyticsUseCase } from '../../application/use-cases/get-telemedicine-analytics/get-telemedicine-analytics.use-case.js';
import { GetVerificationAnalyticsUseCase } from '../../application/use-cases/get-verification-analytics/get-verification-analytics.use-case.js';

import { ReportingController } from './reporting.controller.js';

const SUPER_ADMIN_TOKEN = 'valid-super-admin-token';
const DOCTOR_TOKEN = 'valid-doctor-token';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === SUPER_ADMIN_TOKEN) return { accountId: '99999999-9999-4999-8999-999999999999', role: AccountRole.SuperAdmin };
    if (token === DOCTOR_TOKEN) return { accountId: '88888888-8888-4888-8888-888888888888', role: AccountRole.Doctor };
    throw new Error('invalid token');
  }
}

const dashboardResult = {
  totalDoctors: 5,
  verifiedDoctors: 4,
  pendingVerification: 1,
  totalPatients: 20,
  activePatients: 12,
  totalAppointments: 30,
  completedAppointments: 20,
  cancelledAppointments: 5,
  upcomingAppointments: 5,
  videoConsultations: 15,
  payments: 18,
  revenue: 4500,
  averageConsultationDurationMinutes: 22.5,
  averageRating: 4.6,
};

describe('ReportingController (integration)', () => {
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        PinoLoggerService,
        { provide: GetDashboardKpisUseCase, useValue: { execute: async () => dashboardResult } },
        {
          provide: GetAppointmentAnalyticsUseCase,
          useValue: {
            execute: async () => ({
              totalCount: 0,
              completedCount: 0,
              cancelledCount: 0,
              noShowCount: 0,
              upcomingCount: 0,
              completionRate: 0,
              cancellationRate: 0,
              noShowRate: 0,
              byBucket: [],
              peakHours: [],
              peakDays: [],
              typeDistribution: { free: 0, paid: 0 },
            }),
          },
        },
        { provide: GetDoctorAnalyticsUseCase, useValue: { execute: async () => ({ entries: [], total: 0 }) } },
        {
          provide: GetPatientAnalyticsUseCase,
          useValue: {
            execute: async () => ({
              newPatients: 0,
              returningPatients: 0,
              verifiedPatients: 0,
              activePatients: 0,
              genderDistribution: {},
              ageDistribution: [],
              mostActivePatients: [],
            }),
          },
        },
        {
          provide: GetPaymentAnalyticsUseCase,
          useValue: {
            execute: async () => ({
              revenue: 0,
              revenueGrowthPercent: null,
              transactions: 0,
              successfulPayments: 0,
              failedPayments: 0,
              refunds: 0,
              averageConsultationPrice: null,
            }),
          },
        },
        {
          provide: GetTelemedicineAnalyticsUseCase,
          useValue: { execute: async () => ({ totalSessions: 0, completedSessions: 0, averageDurationMinutes: null }) },
        },
        {
          provide: GetVerificationAnalyticsUseCase,
          useValue: {
            execute: async () => ({
              pending: 0,
              approved: 0,
              rejected: 0,
              suspended: 0,
              averageReviewTimeHours: null,
              doctorCases: 0,
              patientCases: 0,
            }),
          },
        },
        { provide: GetNotificationAnalyticsUseCase, useValue: { execute: async () => ({ sent: 0, unread: 0, read: 0 }) } },
        { provide: ExportReportCsvUseCase, useValue: { execute: async () => 'metric,value\nrevenue,0' } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: createValidationException }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('GET /admin/analytics/kpis rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).get('/admin/analytics/kpis').expect(401);
  });

  it('GET /admin/analytics/kpis rejects a non-SuperAdmin caller with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/analytics/kpis')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('GET /admin/analytics/kpis returns the composed dashboard KPIs for a SuperAdmin', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/analytics/kpis')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.totalDoctors, 5);
    assert.equal(response.body.data.revenue, 4500);
    assert.equal(response.body.data.averageRating, 4.6);
  });

  const otherRoutes = ['appointments', 'doctors', 'patients', 'payments', 'telemedicine', 'verification', 'notifications'];
  for (const route of otherRoutes) {
    it(`GET /admin/analytics/${route} returns 200 for a SuperAdmin`, async () => {
      await request(app.getHttpServer())
        .get(`/admin/analytics/${route}`)
        .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
        .expect(200);
    });
  }

  it('GET /admin/analytics/export streams a CSV body with an attachment header', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/analytics/export?report=payments')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.match(response.headers['content-type'], /text\/csv/);
    assert.match(response.headers['content-disposition'], /attachment; filename="payments-report\.csv"/);
    assert.equal(response.text, 'metric,value\nrevenue,0');
  });

  it('GET /admin/analytics/export rejects an unknown report section', async () => {
    await request(app.getHttpServer())
      .get('/admin/analytics/export?report=not-a-real-section')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(400);
  });

  it('GET /admin/analytics/doctors rejects a non-UUID doctorId filter', async () => {
    await request(app.getHttpServer())
      .get('/admin/analytics/doctors?doctorId=not-a-uuid')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(400);
  });
});
