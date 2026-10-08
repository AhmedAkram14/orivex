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

/** Thrown when an upload is cancelled through its `AbortSignal`. */
export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled.');
    this.name = 'UploadCancelledError';
  }
}

/**
 * The same PUT as `putFileToSignedUrl` (same URL, header and body), through XMLHttpRequest so the caller can show
 * progress (0..1) and cancel it -- `fetch` reports neither for an upload body.
 */
export function putFileToSignedUrlWithProgress(
  signedUrl: string,
  file: File,
  { onProgress, signal }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadCancelledError());
      return;
    }
    const request = new XMLHttpRequest();
    request.open('PUT', signedUrl);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`Upload to storage failed with status ${request.status}.`));
      }
    };
    request.onerror = () => reject(new Error('Upload to storage failed.'));
    request.onabort = () => reject(new UploadCancelledError());
    signal?.addEventListener('abort', () => request.abort(), { once: true });
    request.send(file);
  });
}

export interface UploadMediaAssetVariables {
  file: File;
  purpose: MediaAssetPurpose;
  /** 0..1 while the file's bytes go up; when given, the PUT reports progress (see `putFileToSignedUrlWithProgress`). */
  onProgress?: (fraction: number) => void;
  /** Cancels the upload (rejects with `UploadCancelledError`). */
  signal?: AbortSignal;
}

/**
 * The full upload-intent -> PUT -> confirm flow (AssetModule's real
 * three-step contract) as one mutation: callers only ever hand it a `File`
 * and a `purpose`, never touch the intermediate signed URL themselves.
 */
export function useUploadMediaAsset() {
  return useMutation({
    mutationFn: async ({ file, purpose, onProgress, signal }: UploadMediaAssetVariables): Promise<MediaAsset> => {
      const intent = await mediaApi.createUploadIntent({
        contentType: file.type,
        purpose,
        sizeEstimate: file.size,
      });
      if (!intent.signedUrl) {
        throw new Error('No signed upload URL was returned.');
      }
      if (onProgress || signal) {
        await putFileToSignedUrlWithProgress(intent.signedUrl, file, { onProgress, signal });
      } else {
        await putFileToSignedUrl(intent.signedUrl, file);
      }
      if (signal?.aborted) throw new UploadCancelledError();
      return mediaApi.confirmUpload(intent.id);
    },
  });
}
