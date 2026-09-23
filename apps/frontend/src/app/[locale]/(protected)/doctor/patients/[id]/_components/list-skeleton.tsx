import { Skeleton } from '@/shared/ui/skeleton';

export interface ListSkeletonProps {
  rows?: number;
}

// P2: per-tab loading states used to be one generic full-width block,
// which reads as "something is loading" but not "a list of rows is coming"
// -- shaped like the row-based content every tab on this page actually
// renders (medical history entries, appointments, prescriptions,
// documents), so the layout doesn't visibly jump once real data lands.
export function ListSkeleton({ rows = 3 }: ListSkeletonProps) {
  return (
    <ul className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex flex-col gap-2 rounded-xl border border-border-default/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-3/4" />
        </li>
      ))}
    </ul>
  );
}
