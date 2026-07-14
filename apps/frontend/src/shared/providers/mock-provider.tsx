'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { env } from '@/shared/lib/env';

/**
 * Starts the MSW browser worker only when explicitly opted into via
 * NEXT_PUBLIC_ENABLE_API_MOCKS=true (never by default — a real backend
 * call silently turning into a mock is worse than a mock that never
 * activates). Renders nothing until the worker is ready in that case, so a
 * real request can't slip through before interception starts; renders
 * children immediately otherwise, so this is a no-op cost-wise in every
 * environment that hasn't opted in.
 */
export function MockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!env.enableApiMocks);

  useEffect(() => {
    if (!env.enableApiMocks) return;
    import('@/mocks/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }).then(() => setReady(true)));
  }, []);

  if (!ready) return null;
  return children;
}
