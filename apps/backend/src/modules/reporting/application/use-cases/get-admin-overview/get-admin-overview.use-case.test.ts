import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DateWindow } from '../../dto/previous-period.js';
import type { ReportFilter } from '../../dto/report-filter.js';
import type { AppointmentAnalyticsResult } from '../../ports/appointment-analytics-query.port.js';

import { GetAdminOverviewUseCase } from './get-admin-overview.use-case.js';

// 12:00 in Cairo on Sunday 18 October 2026 (UTC+3, summer time).
const NOW = new Date('2026-10-18T09:00:00.000Z');

function appointments(totalCount: number, overrides: Partial<AppointmentAnalyticsResult> = {}): AppointmentAnalyticsResult {
  return {
    totalCount,
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
    ...overrides,
  };
}

function build() {
  const calls = {
    appointmentFilters: [] as ReportFilter[],
    paymentWindows: [] as Array<{ current: DateWindow; previous?: DateWindow }>,
    activePatientWindow: null as DateWindow | null,
    activeDoctorWindow: null as DateWindow | null,
  };
  const useCase = new GetAdminOverviewUseCase(
    {
      getPendingVerifications: async () => ({ count: 3, oldestWaitingSince: new Date('2026-10-14T08:00:00Z') }),
      getOpenDisputes: async () => ({ count: 1, oldestWaitingSince: new Date('2026-10-17T08:00:00Z') }),
      getFlaggedReviews: async () => ({ count: 2, oldestWaitingSince: null }),
    },
    {
      getAnalytics: async () => ({
        pending: 3, approved: 10, approvedDoctors: 8, rejected: 1, suspended: 0, averageReviewTimeHours: 31.5, doctorCases: 9, patientCases: 5,
      }),
    },
    {
      getAnalytics: async (filter) => {
        calls.appointmentFilters.push(filter);
        if (!filter.dateFrom) {
          return appointments(150, { completionRate: 0.713, cancellationRate: 0.054, noShowRate: 0.027 });
        }
        const days = Math.round((filter.dateTo!.getTime() - filter.dateFrom.getTime()) / 86_400_000);
        return appointments(days <= 1 ? 6 : 31);
      },
    },
    {
      getAnalytics: async (_filter, current, previous) => {
        calls.paymentWindows.push({ current, previous });
        return previous
          ? { revenue: 1200, revenueGrowthPercent: 20, transactions: 4, successfulPayments: 4, failedPayments: 9, refunds: 0, averageConsultationPrice: 300 }
          : { revenue: 40_000, revenueGrowthPercent: null, transactions: 120, successfulPayments: 115, failedPayments: 2, refunds: 3, averageConsultationPrice: 330 };
      },
    },
    {
      getAnalytics: async () => {
        throw new Error('the overview reads the active count directly, never the whole patient section');
      },
      countActivePatients: async (window) => {
        calls.activePatientWindow = window;
        return 13;
      },
    },
    {
      getActivity: async () => {
        throw new Error('not used by the overview');
      },
      countActiveDoctors: async (window) => {
        calls.activeDoctorWindow = window;
        return 9;
      },
    },
  );
  return { useCase, calls };
}

describe('GetAdminOverviewUseCase', () => {
  it('reports each work queue as its own count and oldest-waiting time, plus the average review time', async () => {
    const { useCase } = build();
    const result = await useCase.execute(NOW);

    assert.deepEqual(result.needsAttention.pendingVerifications, { count: 3, oldestWaitingSince: new Date('2026-10-14T08:00:00Z') });
    assert.deepEqual(result.needsAttention.openDisputes, { count: 1, oldestWaitingSince: new Date('2026-10-17T08:00:00Z') });
    assert.deepEqual(result.needsAttention.flaggedReviews, { count: 2, oldestWaitingSince: null });
    assert.equal(result.averageVerificationReviewHours, 31.5);
    assert.equal(result.generatedAt, NOW);
  });

  it('counts appointments over Cairo calendar days: today, and today plus the 6 days before it', async () => {
    const { useCase, calls } = build();
    const result = await useCase.execute(NOW);

    const dated = calls.appointmentFilters.filter((filter) => filter.dateFrom);
    assert.deepEqual(
      dated.map((filter) => [filter.dateFrom!.toISOString(), filter.dateTo!.toISOString()]),
      [
        ['2026-10-17T21:00:00.000Z', '2026-10-18T20:59:59.999Z'],
        ['2026-10-11T21:00:00.000Z', '2026-10-18T20:59:59.999Z'],
      ],
    );
    assert.equal(result.health.appointmentsToday, 6);
    assert.equal(result.health.appointmentsLast7Days, 31);
  });

  it('takes the appointment rates from the unfiltered query, the one Analytics shows by default', async () => {
    const { useCase, calls } = build();
    const result = await useCase.execute(NOW);

    assert.ok(calls.appointmentFilters.some((filter) => Object.keys(filter).length === 0));
    assert.equal(result.health.completionRate, 0.713);
    assert.equal(result.health.cancellationRate, 0.054);
    assert.equal(result.health.noShowRate, 0.027);
  });

  it('compares revenue today so far with the same stretch of last week, and reads failed payments over the trailing 30 days', async () => {
    const { useCase, calls } = build();
    const result = await useCase.execute(NOW);

    const compared = calls.paymentWindows.find((call) => call.previous)!;
    assert.equal(compared.current.from.toISOString(), '2026-10-17T21:00:00.000Z');
    assert.equal(compared.current.to.toISOString(), NOW.toISOString());
    assert.equal(compared.previous!.from.toISOString(), '2026-10-10T21:00:00.000Z');
    assert.equal(compared.previous!.to.toISOString(), '2026-10-11T09:00:00.000Z');
    assert.equal(result.health.revenueToday, 1200);
    assert.equal(result.health.revenueChangePercent, 20);

    const trailing = calls.paymentWindows.find((call) => !call.previous)!;
    assert.equal(trailing.current.to.toISOString(), NOW.toISOString());
    assert.equal(Math.round((trailing.current.to.getTime() - trailing.current.from.getTime()) / 86_400_000), 30);
    assert.equal(result.health.failedPayments, 2, 'the 30-day figure, not today\'s');
  });

  it('counts active doctors and patients over the same trailing 30-day window', async () => {
    const { useCase, calls } = build();
    const result = await useCase.execute(NOW);

    assert.deepEqual(calls.activePatientWindow, calls.activeDoctorWindow);
    assert.equal(calls.activePatientWindow!.to.toISOString(), NOW.toISOString());
    assert.equal(Math.round((calls.activePatientWindow!.to.getTime() - calls.activePatientWindow!.from.getTime()) / 86_400_000), 30);
    assert.equal(result.health.activePatients, 13);
    assert.equal(result.health.activeDoctors, 9);
    assert.equal(result.health.activeWindowDays, 30);
  });
});
