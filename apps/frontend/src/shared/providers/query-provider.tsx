'use client';

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState, type ReactNode } from 'react';
import { createQueryClient } from '@/shared/lib/api/query-client';
import { env } from '@/shared/lib/env';

// Onboarding Redesign (2026-07-21 proposal, Stage O.7): a mocks-only test
// seam so Playwright can force a refetch after mutating MSW store state
// directly (`shared/providers/mock-provider.tsx`'s
// `window.__mockPatientVerification`), without a real page reload -- a
// reload would re-run every mock store's module-scope seed, wiping the very
// state the test just set up. Only attached when
// NEXT_PUBLIC_ENABLE_API_MOCKS=true, so this never exists in production.
declare global {
  interface Window {
    __queryClient?: QueryClient;
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created inside useState, not at module scope -- one QueryClient per
  // mounted app instance, so no cache leaks between users/requests.
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    if (env.enableApiMocks) {
      window.__queryClient = queryClient;
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
