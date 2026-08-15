import { RouteLoadingSkeleton } from '@/shared/ui/layout/route-loading-skeleton';

/** Next.js's Suspense boundary for the Security route — same shared-chrome-stays-mounted pattern as the role workspace segments. */
export default function Loading() {
  return <RouteLoadingSkeleton />;
}
