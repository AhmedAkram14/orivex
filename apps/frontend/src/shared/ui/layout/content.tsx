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
export function Content({ className, id = 'main-content', ...props }: HTMLAttributes<HTMLElement>) {
  // Phase 8: `id="main-content"` by default (overridable, but no real
  // caller needs to) -- this is the one `<main>` landmark in the app shell
  // (see `ConsultationContainer`'s own comment on not duplicating it), and
  // now the fixed target for AppShell's skip link.
  return <main id={id} className={cn('min-h-0 flex-1 overflow-y-auto bg-canvas', className)} {...props} />;
}
