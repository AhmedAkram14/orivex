import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetPatientAnalyticsUseCase } from './get-patient-analytics.use-case.js';

describe('GetPatientAnalyticsUseCase', () => {
  it('returns the query port result unchanged', async () => {
    const expected = {
      newPatients: 3,
      returningPatients: 1,
      verifiedPatients: 2,
      activePatients: 4,
      genderDistribution: { unknown: 5 },
      ageDistribution: [{ bucket: 'unknown', count: 5 }],
      mostActivePatients: [],
    };
    const useCase = new GetPatientAnalyticsUseCase({ getAnalytics: async () => expected });

    const result = await useCase.execute({});

    assert.deepEqual(result, expected);
  });
});
