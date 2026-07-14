'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from '@/shared/providers/query-provider';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { Toaster } from '@/shared/ui/toaster';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { ToastProvider } from '@/shared/ui/toast';

/**
 * The generic, feature-agnostic client-side provider stack — Theme,
 * Query, Tooltip, Toast. Deliberately does NOT include `SessionProvider`
 * (`features/auth/providers/`): shared/ must never depend on features/
 * (Section 1.6), and SessionProvider calls `authApi`, a feature
 * dependency. `app/[locale]/layout.tsx` (routing, which may depend on
 * both shared/ and features/) is what composes `AppProviders` together
 * with `SessionProvider`.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider delayDuration={200}>
          <ToastProvider>
            {children}
            <Toaster />
          </ToastProvider>
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
