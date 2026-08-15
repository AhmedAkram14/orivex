import type { LucideIcon } from 'lucide-react';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface LinkableStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Optional drill-through destination (e.g. a queue count linking to the queue page) — renders as a real `Link` when present, a static tile otherwise. */
  href?: string;
  /** Shows a skeleton in place of the value — for a stat whose count is still loading, distinct from a stat that is genuinely zero. */
  loading?: boolean;
  className?: string;
  /** Overrides the icon tile's default `bg-primary-subtle text-primary-emphasis` (e.g. per-card accent colors on a multi-stat row) — omitted keeps the existing default unchanged. */
  iconClassName?: string;
  /**
   * Real supporting text under the value (e.g. a rating's review count) —
   * never a fabricated trend/delta. Omitted renders nothing, unchanged from
   * today's layout.
   */
  helperText?: string;
  /**
   * Bumps padding/icon size/value type scale for a more prominent KPI tile
   * (Doctor Workspace's "Today's Summary" redesign) — additive and opt-in;
   * omitted keeps every existing consumer's compact `'md'` default
   * pixel-identical, so this never silently restyles Patient Portal's Health
   * Summary or any other existing caller of this shared primitive.
   */
  size?: 'md' | 'lg';
}

const tileClass = cn(
  'flex items-center gap-3 rounded-lg border border-border-default bg-surface p-4 transition-colors duration-(--duration-fast)',
);

const sizeConfig = {
  md: { tile: '', icon: 'size-10 rounded-md', iconSize: 'md' as const, value: 'text-lg' },
  lg: { tile: 'gap-4 p-6', icon: 'size-14 rounded-full', iconSize: 'lg' as const, value: 'text-3xl' },
};

/**
 * A `StatCard` variant used by any workspace dashboard's summary row (Doctor
 * Workspace's "Today's Summary", Patient Portal's "Health Summary") — adds
 * an optional loading skeleton (workspace counts are fetched, unlike
 * `StatCard`'s always-ready value) and an optional drill-through link.
 * Not a duplicate of `StatCard`: this is what `StatCard` becomes once a
 * tile needs to reflect an in-flight query or link somewhere, which
 * `StatCard` deliberately stays without to remain the simplest possible
 * static tile for callers that don't need either. Domain-agnostic —
 * originally built for Doctor Workspace, generalized when Patient Portal
 * needed the identical shape rather than a duplicate `PatientStatCard`.
 */
export function LinkableStatCard({
  icon,
  label,
  value,
  href,
  loading = false,
  className,
  iconClassName,
  helperText,
  size = 'md',
}: LinkableStatCardProps) {
  const config = sizeConfig[size];
  const content = (
    <>
      <div className={cn('flex shrink-0 items-center justify-center bg-primary-subtle text-primary-emphasis', config.icon, iconClassName)}>
        <Icon icon={icon} size={config.iconSize} />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-xs text-text-tertiary">{label}</p>
        {loading ? (
          <Skeleton className="h-5 w-10" />
        ) : (
          <p className={cn('font-semibold text-text-primary', config.value)}>{value}</p>
        )}
        {!loading && helperText && <p className="text-xs text-text-tertiary">{helperText}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(tileClass, config.tile, 'hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring', className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn(tileClass, config.tile, className)}>{content}</div>;
}
