import { PageContainer } from '@/shared/ui/layout/page-container';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Content-area fallback for a workspace's `loading.tsx` route boundary.
 * Deliberately does NOT render the sidebar/topbar chrome — `(protected)/layout.tsx`
 * sits above these route segments and stays mounted across the navigation this
 * is covering, so re-drawing it here would just flash it a second time.
 */
export function RouteLoadingSkeleton() {
  return (
    <PageContainer aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </PageContainer>
  );
}
