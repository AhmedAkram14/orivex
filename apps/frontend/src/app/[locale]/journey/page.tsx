'use client';

import { JourneyScreen } from '@/features/journey/components/journey-screen';
import { RequireRole } from '@/shared/auth/require-role';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): "Choose Your
 * Journey" -- reachable by any Patient-role account (every account starts
 * and stays Patient through the entire onboarding lifecycle, same guard
 * `/doctor/onboarding` uses). The shared `/dashboard` page is the only
 * thing that ever redirects here; nothing links to this route directly.
 * Moved outside `(protected)` (2026-08-02 redesign) -- `JourneyLayout`
 * guards auth, `JourneyScreen` owns its own full-page chrome (no sidebar).
 */
export default function JourneyPage() {
  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <JourneyScreen />
    </RequireRole>
  );
}
