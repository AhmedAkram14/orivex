import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetTelemedicineAnalyticsUseCase } from './get-telemedicine-analytics.use-case.js';

describe('GetTelemedicineAnalyticsUseCase', () => {
  it('returns the query port result unchanged, including a null average duration when no session has closed yet', async () => {
    const expected = { totalSessions: 2, completedSessions: 0, averageDurationMinutes: null };
    const useCase = new GetTelemedicineAnalyticsUseCase({ getAnalytics: async () => expected });

    const result = await useCase.execute({});

    assert.deepEqual(result, expected);
  });
});
