import { RouteLoadingSkeleton } from '@/shared/ui/layout/route-loading-skeleton';

/** Next.js's Suspense boundary for the whole Patient workspace segment (this route and every nested page beneath it) — the sidebar/topbar chrome above stays mounted; only this content area swaps to a skeleton immediately on navigation, instead of the previous page's content lingering. */
export default function Loading() {
  return <RouteLoadingSkeleton />;
}
