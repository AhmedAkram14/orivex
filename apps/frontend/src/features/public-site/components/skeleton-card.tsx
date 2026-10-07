import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

/** A card-shaped loading placeholder: icon tile, title, two lines, footer row -- the shape of a specialty or feature card. */
export function SkeletonCard() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <Skeleton className="size-14" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex items-center justify-between border-t border-border-default pt-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
    </Card>
  );
}

/** The top of a public page while it loads: clears the navbar, then a hero-sized block. */
export function PageHeroSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-(--page-gutter) pt-28 lg:pt-32">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-72 w-full rounded-(--r-hero)" />
    </div>
  );
}
