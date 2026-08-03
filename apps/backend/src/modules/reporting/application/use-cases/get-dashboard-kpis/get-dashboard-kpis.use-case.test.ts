import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetDashboardKpisUseCase } from './get-dashboard-kpis.use-case.js';

function fakeListAccounts(totals: { doctor: number; patient: number }) {
  return {
    execute: async (query: { role?: string }) => ({
      total: query.role === 'doctor' ? totals.doctor : totals.patient,
      accounts: [],
    }),
  };
}

describe('GetDashboardKpisUseCase', () => {
  it('composes every analytics section and computes a review-weighted platform average rating', async () => {
    const useCase = new GetDashboardKpisUseCase(
      fakeListAccounts({ doctor: 5, patient: 20 }) as never,
      { getAnalytics: async () => ({ pending: 1, approved: 4, rejected: 0, suspended: 0, averageReviewTimeHours: null, doctorCases: 0, patientCases: 0 }) } as never,
      { getAnalytics: async () => ({ totalCount: 30, completedCount: 20, cancelledCount: 5, noShowCount: 0, upcomingCount: 5, completionRate: 0.67, cancellationRate: 0.17, noShowRate: 0, byBucket: [], peakHours: [], peakDays: [], typeDistribution: { free: 0, paid: 0 } }) } as never,
      { getAnalytics: async () => ({ totalSessions: 15, completedSessions: 10, averageDurationMinutes: 22.5 }) } as never,
      { getAnalytics: async () => ({ revenue: 4500, revenueGrowthPercent: null, transactions: 18, successfulPayments: 18, failedPayments: 0, refunds: 0, averageConsultationPrice: 250 }) } as never,
      { getAnalytics: async () => ({ newPatients: 2, returningPatients: 1, verifiedPatients: 3, activePatients: 12, genderDistribution: {}, ageDistribution: [], mostActivePatients: [] }) } as never,
      {
        execute: async () => ({
          entries: [
            { doctorId: 'd1', displayName: 'A', specialtyId: null, completedConsultations: 3, upcomingAppointments: 0, cancellationRate: 0, averageRating: 5, reviewCount: 2, averageSessionDurationMinutes: null, revenueGenerated: 0, patientCount: 0 },
            { doctorId: 'd2', displayName: 'B', specialtyId: null, completedConsultations: 3, upcomingAppointments: 0, cancellationRate: 0, averageRating: 3, reviewCount: 8, averageSessionDurationMinutes: null, revenueGenerated: 0, patientCount: 0 },
          ],
          total: 2,
        }),
      } as never,
    );

    const result = await useCase.execute({});

    assert.equal(result.totalDoctors, 5);
    assert.equal(result.totalPatients, 20);
    assert.equal(result.activePatients, 12);
    assert.equal(result.verifiedDoctors, 4);
    assert.equal(result.pendingVerification, 1);
    assert.equal(result.totalAppointments, 30);
    assert.equal(result.revenue, 4500);
    assert.equal(result.videoConsultations, 15);
    // weighted average: (5*2 + 3*8) / (2+8) = 3.4
    assert.equal(result.averageRating, 3.4);
  });

  it('returns a null average rating (not zero) when no doctor has any reviews yet', async () => {
    const useCase = new GetDashboardKpisUseCase(
      fakeListAccounts({ doctor: 0, patient: 0 }) as never,
      { getAnalytics: async () => ({ pending: 0, approved: 0, rejected: 0, suspended: 0, averageReviewTimeHours: null, doctorCases: 0, patientCases: 0 }) } as never,
      { getAnalytics: async () => ({ totalCount: 0, completedCount: 0, cancelledCount: 0, noShowCount: 0, upcomingCount: 0, completionRate: 0, cancellationRate: 0, noShowRate: 0, byBucket: [], peakHours: [], peakDays: [], typeDistribution: { free: 0, paid: 0 } }) } as never,
      { getAnalytics: async () => ({ totalSessions: 0, completedSessions: 0, averageDurationMinutes: null }) } as never,
      { getAnalytics: async () => ({ revenue: 0, revenueGrowthPercent: null, transactions: 0, successfulPayments: 0, failedPayments: 0, refunds: 0, averageConsultationPrice: null }) } as never,
      { getAnalytics: async () => ({ newPatients: 0, returningPatients: 0, verifiedPatients: 0, activePatients: 0, genderDistribution: {}, ageDistribution: [], mostActivePatients: [] }) } as never,
      { execute: async () => ({ entries: [], total: 0 }) } as never,
    );

    const result = await useCase.execute({});

    assert.equal(result.averageRating, null);
  });
});
