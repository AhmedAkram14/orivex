import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

/** The shape of a `DoctorCard` while results load: avatar + name, chips, rating, fee and actions. */
export function DoctorCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-4 w-2/5" />
      <div className="flex items-center justify-between border-t border-border-default pt-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
    </Card>
  );
}

export function DoctorGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <DoctorCardSkeleton key={index} />
      ))}
    </div>
  );
}
