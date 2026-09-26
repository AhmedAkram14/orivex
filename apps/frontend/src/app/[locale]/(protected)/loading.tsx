import { RouteLoadingSkeleton } from '@/shared/ui/layout/route-loading-skeleton';

/** In-shell Suspense boundary for every protected route that has no `loading.tsx` of its own (e.g. `/dashboard`). Without it, navigation fell through to `[locale]/loading.tsx` -- the full-screen brand splash, which is reserved for cold start. */
export default function Loading() {
  return <RouteLoadingSkeleton />;
}
