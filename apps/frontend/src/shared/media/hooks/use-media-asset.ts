'use client';

import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '@/shared/media/media-api';
import { mediaAssetKeys } from '@/shared/media/hooks/query-keys';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): mints
 * a fresh signed download URL on demand -- `enabled` defaults to `false` so
 * a document viewer only fetches (and the backend only mints a presigned
 * URL) when the admin actually asks to see it, not eagerly for every
 * document in a case.
 */
export function useMediaAsset(mediaAssetId: string, enabled: boolean) {
  return useQuery({
    queryKey: mediaAssetKeys.detail(mediaAssetId),
    queryFn: () => mediaApi.getMediaAsset(mediaAssetId),
    enabled,
    // A presigned URL expires (15 minutes server-side) -- never serve a
    // stale one from cache once it's gone stale client-side either.
    staleTime: 60_000,
  });
}
