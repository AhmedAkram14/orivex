import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/empty-state';
import type { IllustrationKey } from '@/shared/ui/illustrations/illustration';
import { cn } from '@/shared/lib/cn';

export interface EmptyWorkspaceProps {
  illustration?: IllustrationKey;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** An empty-state that fills whatever pane it's placed in (e.g. a `ConsultationContainer` slot) -- for a workspace pane that has nothing to show yet. */
export function EmptyWorkspace({ illustration = 'inbox-quiet', title, description, action, className }: EmptyWorkspaceProps) {
  return (
    <div className={cn('flex h-full min-h-48 flex-1 items-center justify-center', className)}>
      <EmptyState illustration={illustration} title={title} description={description} action={action} />
    </div>
  );
}
