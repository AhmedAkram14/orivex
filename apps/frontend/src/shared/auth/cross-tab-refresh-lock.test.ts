import { afterEach, describe, expect, it, vi } from 'vitest';

import { withCrossTabRefreshLock } from './cross-tab-refresh-lock';

describe('withCrossTabRefreshLock', () => {
  const originalLocks = (navigator as unknown as { locks?: unknown }).locks;

  afterEach(() => {
    Object.defineProperty(navigator, 'locks', { value: originalLocks, configurable: true });
  });

  it('runs the callback directly when the Web Locks API is unsupported', async () => {
    Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });

    const run = vi.fn().mockResolvedValue('result');
    await expect(withCrossTabRefreshLock(run)).resolves.toBe('result');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('routes the callback through navigator.locks.request under the shared lock name', async () => {
    const request = vi.fn((_name: string, callback: () => Promise<unknown>) => callback());
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });

    const run = vi.fn().mockResolvedValue('locked-result');
    await expect(withCrossTabRefreshLock(run)).resolves.toBe('locked-result');

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe('orivex:auth-refresh');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('serializes two overlapping calls -- the second only starts after the first resolves', async () => {
    // A minimal fake LockManager: queues requests and runs them one at a
    // time, mirroring the real Web Locks API's mutual-exclusion guarantee
    // (this is what actually prevents two tabs' refresh calls from ever
    // being in flight at the same time).
    let busy = false;
    const queue: Array<() => void> = [];
    const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
      if (busy) {
        await new Promise<void>((resolve) => queue.push(resolve));
      }
      busy = true;
      try {
        return await callback();
      } finally {
        busy = false;
        const next = queue.shift();
        if (next) next();
      }
    });
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });

    const order: string[] = [];
    let resolveFirst: () => void = () => {};
    const first = withCrossTabRefreshLock(
      () =>
        new Promise<void>((resolve) => {
          order.push('first-start');
          resolveFirst = () => {
            order.push('first-end');
            resolve();
          };
        }),
    );

    const second = withCrossTabRefreshLock(async () => {
      order.push('second-start');
    });

    // Give the microtask queue a tick -- the second call must NOT have
    // started yet, since the first hasn't released the lock.
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(['first-start']);

    resolveFirst();
    await first;
    await second;

    expect(order).toEqual(['first-start', 'first-end', 'second-start']);
  });
});
