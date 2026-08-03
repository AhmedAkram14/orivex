import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetNotificationAnalyticsUseCase } from './get-notification-analytics.use-case.js';

describe('GetNotificationAnalyticsUseCase', () => {
  it('returns the query port result unchanged', async () => {
    const expected = { sent: 10, unread: 3, read: 7 };
    const useCase = new GetNotificationAnalyticsUseCase({ getAnalytics: async () => expected });

    const result = await useCase.execute({});

    assert.deepEqual(result, expected);
  });
});
