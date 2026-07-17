import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetSchedulingRulesUseCase } from './get-scheduling-rules.use-case.js';

describe('GetSchedulingRulesUseCase', () => {
  it('returns the hardcoded global scheduling rules', async () => {
    const useCase = new GetSchedulingRulesUseCase();

    const result = await useCase.execute();

    assert.deepEqual(result, {
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      minNoticeMinutes: 60,
      maxBookingWindowDays: 30,
    });
  });
});
