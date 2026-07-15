import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface ConsultationContainerProps {
  /** The left-hand section list (e.g. Overview/Vitals/Notes/History once a real Consultation module exists) — placeholder navigation today, per this phase's "no medical forms yet" scope. */
  leftNav: ReactNode;
  /** The main consultation workspace content. */
  children: ReactNode;
  /** The right-hand contextual information panel (e.g. patient summary). Optional — a narrower two-pane layout when omitted. */
  rightPanel?: ReactNode;
  className?: string;
}

/**
 * The Consultation Workspace's three-pane layout — Left Navigation, Main
 * Workspace, Right Information Panel. Stacks vertically on small
 * viewports (nothing hidden, unlike the app shell's sidebar/mobile-nav
 * split) since a consultation's side panels are content, not chrome the
 * way app-wide navigation is. Every pane renders whatever the caller
 * supplies — this phase ships placeholder containers only, no real
 * Consultation data or medical forms.
 */
export function ConsultationContainer({ leftNav, children, rightPanel, className }: ConsultationContainerProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_280px]', className)}>
      <aside className="flex flex-col gap-1 rounded-lg border border-border-default bg-surface p-3">{leftNav}</aside>
      {/* Not a <main> element: this always renders inside AppShell's <Content>, which is already the page's one <main> landmark — a second would be an invalid duplicate landmark. */}
      <div className="min-h-96 rounded-lg border border-border-default bg-surface p-4">{children}</div>
      {rightPanel && (
        <aside className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface p-4">
          {rightPanel}
        </aside>
      )}
    </div>
  );
}
