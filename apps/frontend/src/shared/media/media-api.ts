import { apiFetch } from '@/shared/lib/api/client';
import type { MediaAsset, MediaAssetPurpose } from '@/shared/media/types';

export interface CreateUploadIntentRequest {
  contentType: string;
  purpose: MediaAssetPurpose;
  sizeEstimate?: number;
}

/**
 * The only module that talks to `/media-assets/*` -- real backend
 * endpoints (AssetModule's MediaAssetController), open to any authenticated
 * account (no role restriction) since a mediaAsset's owner is always the
 * caller themselves.
 */
export const mediaApi = {
  createUploadIntent: (request: CreateUploadIntentRequest) =>
    apiFetch<MediaAsset>({ method: 'POST', path: '/media-assets/upload-intent', body: request }),

  confirmUpload: (id: string) => apiFetch<MediaAsset>({ method: 'POST', path: `/media-assets/${id}/confirm` }),

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): lets
  // the owner re-fetch their own asset, or a SuperAdmin open a document they
  // don't own (reviewing a verification case) -- a fresh signed download URL
  // each call, never a cached/raw storage URL.
  getMediaAsset: (id: string) => apiFetch<MediaAsset>({ path: `/media-assets/${id}` }),
};
