import { cn } from '@/shared/lib/cn';
import { Skeleton } from '@/shared/ui/skeleton';

/** Content-shaped loading placeholders. They mirror the real layout (same radii, paddings, row heights) so swapping to content shifts nothing. */

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) shadow-xs', className)}
    >
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex min-h-(--row-h) items-center gap-3 rounded-md bg-surface-2 px-4 py-3', className)}>
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <Skeleton className="h-5.5 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex h-full flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) shadow-xs', className)}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function SkeletonCalendar({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col gap-2 rounded-(--r-card) border border-border-default bg-surface p-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, index) => (
          <Skeleton key={index} className="h-14" />
        ))}
      </div>
    </div>
  );
}
