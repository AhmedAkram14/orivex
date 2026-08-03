import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetAppointmentAnalyticsUseCase } from './get-appointment-analytics.use-case.js';

describe('GetAppointmentAnalyticsUseCase', () => {
  it('delegates the filter and bucket straight through to the query port', async () => {
    let captured: unknown;
    const useCase = new GetAppointmentAnalyticsUseCase({
      getAnalytics: async (filter, bucket) => {
        captured = { filter, bucket };
        return {
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
        };
      },
    });

    await useCase.execute({ doctorId: 'd1' }, 'week');

    assert.deepEqual(captured, { filter: { doctorId: 'd1' }, bucket: 'week' });
  });
});
