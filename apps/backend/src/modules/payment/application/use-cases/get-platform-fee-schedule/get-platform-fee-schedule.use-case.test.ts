import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLATFORM_COMMISSION_RATE } from '../get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.js';

import { GetPlatformFeeScheduleUseCase } from './get-platform-fee-schedule.use-case.js';

describe('GetPlatformFeeScheduleUseCase', () => {
  it('discloses exactly the commission rate the earnings ledger applies', () => {
    assert.deepEqual(new GetPlatformFeeScheduleUseCase().execute(), { commissionRate: PLATFORM_COMMISSION_RATE });
  });
});
