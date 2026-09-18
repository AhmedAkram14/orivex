import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePreviousWindow } from './resolve-previous-window.js';

describe('resolvePreviousWindow', () => {
  it('returns the immediately-preceding window of equal duration', () => {
    const dateFrom = new Date('2026-01-08T00:00:00Z');
    const dateTo = new Date('2026-01-15T00:00:00Z');

    const previous = resolvePreviousWindow(dateFrom, dateTo);

    assert.equal(previous.to.toISOString(), dateFrom.toISOString());
    assert.equal(previous.from.toISOString(), new Date('2026-01-01T00:00:00Z').toISOString());
  });
});
