'use client';

import { useMutation } from '@tanstack/react-query';
import { mediaApi } from '@/shared/media/media-api';
import type { MediaAsset, MediaAssetPurpose } from '@/shared/media/types';

/**
 * The one place that actually PUTs a file's bytes to an S3-compatible
 * presigned URL. Exported so other "upload a file for someone else's
 * MediaAsset" flows (e.g. the doctor uploading a document to a patient's
 * chart, Doctor Patient Chart plan 4.2) can reuse this exact step instead
 * of reimplementing it -- only the intent/confirm calls around it differ.
 */
export async function putFileToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Upload to storage failed with status ${response.status}.`);
  }
}

/**
 * The full upload-intent -> PUT -> confirm flow (AssetModule's real
 * three-step contract) as one mutation: callers only ever hand it a `File`
 * and a `purpose`, never touch the intermediate signed URL themselves.
 */
export function useUploadMediaAsset() {
  return useMutation({
    mutationFn: async ({ file, purpose }: { file: File; purpose: MediaAssetPurpose }): Promise<MediaAsset> => {
      const intent = await mediaApi.createUploadIntent({
        contentType: file.type,
        purpose,
        sizeEstimate: file.size,
      });
      if (!intent.signedUrl) {
        throw new Error('No signed upload URL was returned.');
      }
      await putFileToSignedUrl(intent.signedUrl, file);
      return mediaApi.confirmUpload(intent.id);
    },
  });
}
