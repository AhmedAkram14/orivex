import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { captureUnexpectedError } from './error-reporting.js';

describe('captureUnexpectedError', () => {
  it('does nothing (no throw) when Sentry was never initialized (SENTRY_DSN unset)', () => {
    assert.doesNotThrow(() =>
      captureUnexpectedError(new Error('boom'), { requestId: 'req-1', path: '/payments' }),
    );
  });
});
