'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorProfileKeys } from '@/features/doctor/hooks/query-keys';
import { ApiError } from '@/shared/lib/api/client';

// GET /doctors/me cleanly 404s when the account hasn't registered as a
// doctor yet -- an expected, non-error outcome (mirrors
// `use-journey-status.ts`'s `hasExistingDoctorProfile` precedent), so it's
// swallowed here rather than left to propagate as a query error and trip
// the global "Request failed" toast for what is normal onboarding state.
async function getProfileOrNull() {
  try {
    return await doctorApi.getProfile();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // React Query forbids a queryFn resolving to `undefined` (throws its
      // own "Query data cannot be undefined" error) -- `null` is the value
      // that means "no profile yet" without tripping that guard.
      return null;
    }
    throw error;
  }
}

export function useDoctorProfile() {
  return useQuery({
    queryKey: doctorProfileKeys.detail('current'),
    queryFn: getProfileOrNull,
  });
}
