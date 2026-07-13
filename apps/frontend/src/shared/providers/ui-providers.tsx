'use client';

import type { ReactNode } from 'react';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { ToastProvider, ToastViewport } from '@/shared/ui/toast';

/**
 * Mounts the context providers Radix's Tooltip and Toast primitives require
 * at the root of the tree. This Client Component boundary is intentional
 * and minimal — it wraps `children` (still rendered as Server Components)
 * rather than converting the whole app to client-rendered, consistent with
 * Phase 27's "Server Components by default" direction.
 */
export function UiProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <ToastProvider>
        {children}
        <ToastViewport />
      </ToastProvider>
    </TooltipProvider>
  );
}
