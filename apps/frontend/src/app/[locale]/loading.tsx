import { LoadingState } from '@/shared/ui/loading-state';

/** Next.js's automatic Suspense boundary for this segment — shown during route navigation, built on Phase 1's LoadingState rather than a bespoke spinner. */
export default function Loading() {
  return <LoadingState />;
}
