'use client';

import type { ReactNode } from 'react';
import { useFeatureFlag } from '@/shared/lib/feature-flags';

export interface FeatureGuardProps {
  children: ReactNode;
  flag: string;
  /** Matches useFeatureFlag's own default-value contract — see Phase 20's own scaffolded note: this resolves locally only, no backend ConfigurationModule exists. */
  defaultValue?: boolean;
  fallback?: ReactNode;
}

/**
 * Gates rendering behind a feature flag rather than a role or permission
 * — the third of the three guard primitives this phase names alongside
 * RoleGuard/PermissionGuard. Thin by design: all the real logic already
 * lives in `useFeatureFlag` (Phase 2's scaffolded stub), this component
 * only exists so a page can gate a whole subtree declaratively instead of
 * every page re-deriving `const enabled = useFeatureFlag(...)` and
 * conditionally rendering itself.
 */
export function FeatureGuard({ children, flag, defaultValue = false, fallback = null }: FeatureGuardProps) {
  const enabled = useFeatureFlag(flag, defaultValue);
  return enabled ? children : fallback;
}
