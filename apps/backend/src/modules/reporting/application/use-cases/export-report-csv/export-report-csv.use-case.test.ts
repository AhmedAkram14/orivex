import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ExportReportCsvUseCase } from './export-report-csv.use-case.js';

function fakePayments() {
  return {
    execute: async () => ({
      revenue: 100,
      revenueGrowthPercent: null,
      transactions: 2,
      successfulPayments: 2,
      failedPayments: 0,
      refunds: 0,
      averageConsultationPrice: 50,
    }),
  };
}

function fakeDoctors() {
  return {
    execute: async () => ({
      entries: [
        {
          doctorId: 'd1',
          displayName: 'Dr. A',
          specialtyId: null,
          completedConsultations: 3,
          upcomingAppointments: 1,
          cancellationRate: 0,
          averageRating: 4.5,
          reviewCount: 2,
          averageSessionDurationMinutes: 20,
          revenueGenerated: 500,
          patientCount: 3,
        },
      ],
      total: 1,
    }),
  };
}

describe('ExportReportCsvUseCase', () => {
  it('produces a CSV string for the payments section using the real payment analytics data', async () => {
    const useCase = new ExportReportCsvUseCase(
      { execute: async () => ({}) } as never,
      fakeDoctors() as never,
      { execute: async () => ({}) } as never,
      fakePayments() as never,
      { execute: async () => ({}) } as never,
      { execute: async () => ({}) } as never,
      { execute: async () => ({}) } as never,
    );

    const csv = await useCase.execute({ section: 'payments', filter: {} });

    assert.match(csv, /metric,value/);
    assert.match(csv, /revenue,100/);
  });

  it('produces a CSV string for the doctors section with one row per doctor', async () => {
    const useCase = new ExportReportCsvUseCase(
      { execute: async () => ({}) } as never,
      fakeDoctors() as never,
      { execute: async () => ({}) } as never,
      { execute: async () => ({}) } as never,
      { execute: async () => ({}) } as never,
      { execute: async () => ({}) } as never,
      { execute: async () => ({}) } as never,
    );

    const csv = await useCase.execute({ section: 'doctors', filter: {} });

    assert.match(csv, /doctorId,displayName/);
    assert.match(csv, /d1,Dr\. A/);
  });
});
