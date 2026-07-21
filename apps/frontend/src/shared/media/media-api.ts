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
};
