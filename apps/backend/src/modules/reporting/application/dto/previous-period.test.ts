import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveCurrentWindow, resolvePreviousWindow } from './previous-period.js';

describe('resolveCurrentWindow / resolvePreviousWindow', () => {
  it('defaults to a trailing 30-day window when no dates are given', () => {
    const window = resolveCurrentWindow();
    const diffDays = (window.to.getTime() - window.from.getTime()) / (24 * 60 * 60 * 1000);
    assert.equal(Math.round(diffDays), 30);
  });

  it('uses the explicit range when given', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-08T00:00:00Z');
    const window = resolveCurrentWindow(from, to);
    assert.equal(window.from.toISOString(), from.toISOString());
    assert.equal(window.to.toISOString(), to.toISOString());
  });

  it('computes the immediately-preceding window of equal duration', () => {
    const current = { from: new Date('2026-01-08T00:00:00Z'), to: new Date('2026-01-15T00:00:00Z') };
    const previous = resolvePreviousWindow(current);
    assert.equal(previous.to.toISOString(), current.from.toISOString());
    assert.equal(previous.from.toISOString(), new Date('2026-01-01T00:00:00Z').toISOString());
  });
});
