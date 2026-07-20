'use client';

import { useFeatureFlag } from '@/shared/lib/feature-flags';

/**
 * Resolves every nav-related feature flag with a fixed, unconditional set
 * of `useFeatureFlag` calls (rules-of-hooks requires each call to be
 * written out, not looped over `NAV_FEATURE_FLAGS` — ESLint's
 * `react-hooks/rules-of-hooks` correctly rejects calling a hook inside
 * `.map()`), returning a plain lookup function `filterNavigationByAccess`
 * can call per item without itself needing to be a hook. Adding a new
 * flagged nav item means adding its flag both to `NAVIGATION_CONFIG` and
 * as a new call here.
 */
export function useNavigationFeatureFlags(): (flag: string) => boolean {
  const patients = useFeatureFlag('nav.patients', false);
  const appointments = useFeatureFlag('nav.appointments', false);
  const prescriptions = useFeatureFlag('nav.prescriptions', false);
  const billing = useFeatureFlag('nav.billing', false);
  // Real as of ORIVEX Roadmap 2.0 Stage 4 -- /admin/users now exists.
  const adminUsers = useFeatureFlag('nav.adminUsers', true);

  const lookup: Record<string, boolean> = {
    'nav.patients': patients,
    'nav.appointments': appointments,
    'nav.prescriptions': prescriptions,
    'nav.billing': billing,
    'nav.adminUsers': adminUsers,
  };

  return (flag: string) => lookup[flag] ?? false;
}
