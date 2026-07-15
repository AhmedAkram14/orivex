import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@/shared/lib/cn';

export interface EmptyWorkspaceProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** An empty-state that fills whatever pane it's placed in (e.g. a `ConsultationContainer` slot) — distinct from `EmptyDashboard` (a fixed min-height block for a dashboard grid cell). Used wherever a workspace pane has nothing to show yet, e.g. before a real Consultation module populates it. */
export function EmptyWorkspace({ icon, title, description, action, className }: EmptyWorkspaceProps) {
  return (
    <div className={cn('flex h-full min-h-48 flex-1 items-center justify-center', className)}>
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </div>
  );
}
