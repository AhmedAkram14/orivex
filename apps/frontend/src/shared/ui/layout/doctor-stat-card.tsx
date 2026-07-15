import type { LucideIcon } from 'lucide-react';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface DoctorStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Optional drill-through destination (e.g. a queue count linking to the queue page) — renders as a real `Link` when present, a static tile otherwise. */
  href?: string;
  /** Shows a skeleton in place of the value — for a stat whose count is still loading, distinct from a stat that is genuinely zero. */
  loading?: boolean;
  className?: string;
}

const tileClass = cn(
  'flex items-center gap-3 rounded-lg border border-border-default bg-surface p-4 transition-colors',
);

/**
 * A `StatCard` variant for the Doctor Workspace's "Today's Summary" row —
 * adds an optional loading skeleton (workspace counts are fetched, unlike
 * `StatCard`'s always-ready value) and an optional drill-through link.
 * Not a duplicate of `StatCard`: this is what `StatCard` becomes once a
 * tile needs to reflect an in-flight query or link somewhere, which
 * `StatCard` deliberately stays without to remain the simplest possible
 * static tile for callers that don't need either.
 */
export function DoctorStatCard({ icon, label, value, href, loading = false, className }: DoctorStatCardProps) {
  const content = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
        <Icon icon={icon} size="md" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-xs text-text-tertiary">{label}</p>
        {loading ? <Skeleton className="h-5 w-10" /> : <p className="text-lg font-semibold text-text-primary">{value}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(tileClass, 'hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring', className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn(tileClass, className)}>{content}</div>;
}
