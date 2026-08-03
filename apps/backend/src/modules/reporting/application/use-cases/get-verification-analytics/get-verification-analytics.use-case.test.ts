import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetVerificationAnalyticsUseCase } from './get-verification-analytics.use-case.js';

describe('GetVerificationAnalyticsUseCase', () => {
  it('returns the query port result unchanged', async () => {
    const expected = {
      pending: 2,
      approved: 5,
      rejected: 1,
      suspended: 0,
      averageReviewTimeHours: 12.5,
      doctorCases: 6,
      patientCases: 2,
    };
    const useCase = new GetVerificationAnalyticsUseCase({ getAnalytics: async () => expected });

    const result = await useCase.execute({});

    assert.deepEqual(result, expected);
  });
});
