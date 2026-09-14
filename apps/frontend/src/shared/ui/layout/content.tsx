import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * The main scrollable content region beside Sidebar / below Topbar.
 * `min-h-0` overrides the flex item default of `min-height: auto`, which
 * otherwise lets a tall child (e.g. a long edit form) grow this `<main>`
 * past its flex row's `overflow-hidden` bound instead of being clamped to
 * it -- without this, a tall enough page pushes the whole `<html>`/`<body>`
 * into becoming the scroll container instead of this element's own
 * `overflow-y-auto`, scrolling the fixed Topbar/Sidebar off-screen with it.
 */
export function Content({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <main className={cn('min-h-0 flex-1 overflow-y-auto bg-canvas', className)} {...props} />;
}
