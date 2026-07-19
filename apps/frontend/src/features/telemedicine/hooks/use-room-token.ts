'use client';

import { useQuery } from '@tanstack/react-query';
import { telemedicineApi } from '@/features/telemedicine/api/telemedicine-api';
import { telemedicineKeys } from '@/features/telemedicine/hooks/query-keys';

/**
 * Mints a fresh LiveKit room-access token on mount -- never cached across
 * sessions (a token is only ever good for the one call it was requested
 * for), and never retried automatically (a not-configured/ownership
 * failure is a real, user-facing state, not a transient network blip).
 */
export function useRoomToken(consultationSessionId: string, displayName?: string) {
  return useQuery({
    queryKey: telemedicineKeys.detail(consultationSessionId),
    queryFn: () => telemedicineApi.mintRoomToken(consultationSessionId, displayName),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
