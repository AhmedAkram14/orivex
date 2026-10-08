'use client';

import type { ReactNode } from 'react';
import {
  FocusedHeader,
  type FocusedHeaderProps,
} from '@/features/journey/components/focused-header';
import { cn } from '@/shared/lib/cn';

export interface FocusedPageProps extends FocusedHeaderProps {
  /** The page's title block (progress, h1, subtitle) above the content. */
  intro?: ReactNode;
  children: ReactNode;
  /** The content column's max width: 520px for a single short form, 640px for longer steps. */
  width?: 'narrow' | 'regular';
  className?: string;
}

/** The focused onboarding frame: `FocusedHeader`, then one centred column on the canvas. */
export function FocusedPage({
  intro,
  children,
  width = 'regular',
  className,
  ...header
}: FocusedPageProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <FocusedHeader {...header} />
      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col gap-4 px-4 pb-0 sm:gap-6 sm:px-0 sm:pt-2 sm:pb-12',
          width === 'narrow' ? 'max-w-130' : 'max-w-160',
          className,
        )}
      >
        {intro}
        {children}
      </main>
    </div>
  );
}
