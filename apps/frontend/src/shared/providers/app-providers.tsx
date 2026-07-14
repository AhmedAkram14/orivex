'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/shared/auth/auth-provider';
import { QueryProvider } from '@/shared/providers/query-provider';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { Toaster } from '@/shared/ui/toaster';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { ToastProvider } from '@/shared/ui/toast';

/**
 * The full client-side provider stack, composed once here rather than
 * nested ad hoc in the root layout. Order matters: Theme and Query have no
 * dependency on each other or on Auth; Auth is innermost among these three
 * only because it's the one most likely to eventually depend on query
 * state (e.g. a "refresh session" query) once Phase 4 wires a real
 * backend. Tooltip/Toast wrap everything last since they're pure UI
 * concerns with no data dependency at all.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <ToastProvider>
              {children}
              <Toaster />
            </ToastProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
