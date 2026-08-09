import { AppLoadingScreen } from '@/shared/ui/app-loading-screen';

/** Next.js's automatic Suspense boundary for this segment — shown during route navigation, before any layout chrome has mounted, so it gets the full-viewport branded splash rather than the in-shell `LoadingState`. */
export default function Loading() {
  return <AppLoadingScreen />;
}
