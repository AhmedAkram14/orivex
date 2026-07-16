import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

const WEEK_SKELETON_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface LoadingCalendarProps {
  className?: string;
}

/** The 7-column loading placeholder every calendar view shows while its underlying availability query is still in flight — extracted so `DoctorSchedulePage` (and any future calendar consumer) shares one loading shell instead of inlining the same skeleton grid. */
export function LoadingCalendar({ className }: LoadingCalendarProps) {
  return (
    <div className={cn('grid grid-cols-7 gap-2', className)} aria-busy="true" aria-live="polite">
      {WEEK_SKELETON_KEYS.map((key) => (
        <Skeleton key={key} className="h-24 w-full" />
      ))}
    </div>
  );
}
