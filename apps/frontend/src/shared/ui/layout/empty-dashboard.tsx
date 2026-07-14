import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/empty-state';

export interface EmptyDashboardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** The dashboard-level empty state — for a role/workspace with no widgets configured yet, distinct from `EmptyState` (generic) only in that it's the specific composition dashboards reach for, so every dashboard's "nothing here yet" looks identical rather than each hand-tuning `EmptyState`'s spacing. */
export function EmptyDashboard({ icon, title, description, action }: EmptyDashboardProps) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border-default">
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </div>
  );
}
