'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { patientDocumentsKeys } from '@/features/patient/hooks/query-keys';
import { ApiError } from '@/shared/lib/api/client';
import { SHARED_ERROR_CODES } from '@/shared/lib/api/error-codes';
import { UploadCancelledError, useUploadMediaAsset } from '@/shared/media/hooks/use-upload-media-asset';
import type { UploadTileState } from '@/shared/verification/components/upload-tile';

export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

// What the upload-intent endpoint accepts for a clinical document. The API states no size limit, so none is
// enforced or promised here; the types are the ones the page has always offered.
function isAccepted(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.test(file.name);
}

/**
 * Drives an `UploadTile` that adds one clinical document at a time (`clinical_attachment`, the real
 * upload-intent -> PUT -> confirm flow): progress and Cancel while it uploads, a type check before it starts,
 * Retry after a failure. On success the documents list is refetched, so the new file shows in Documents and
 * in Overview > Recent documents without a reload, and the tile is ready for the next one.
 *
 * An unverified patient is refused by the API (IDENTITY_VERIFICATION_REQUIRED): `needsVerification` then
 * tells the caller to show the identity-verification gate instead of the tile.
 */
export function useDocumentUpload() {
  const t = useTranslations('patient.records.documents');
  const tUpload = useTranslations('ds.upload');
  const queryClient = useQueryClient();
  const upload = useUploadMediaAsset();
  const [state, setState] = useState<UploadTileState>({ kind: 'idle' });
  const [uploadedCount, setUploadedCount] = useState(0);
  const [needsVerification, setNeedsVerification] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const lastFile = useRef<File | null>(null);

  // Stop an upload still running when the tile goes away.
  useEffect(() => () => abort.current?.abort(), []);

  async function start(file: File) {
    const controller = new AbortController();
    abort.current = controller;
    lastFile.current = file;
    setState({ kind: 'uploading', progress: 0 });
    try {
      await upload.mutateAsync({
        file,
        purpose: 'clinical_attachment',
        signal: controller.signal,
        onProgress: (progress) => setState({ kind: 'uploading', progress }),
      });
      await queryClient.invalidateQueries({ queryKey: patientDocumentsKeys.lists() });
      setUploadedCount((count) => count + 1);
      setState({ kind: 'idle' });
    } catch (error) {
      if (error instanceof UploadCancelledError) {
        setState({ kind: 'idle' });
      } else if (error instanceof ApiError && error.code === SHARED_ERROR_CODES.identityVerificationRequired) {
        setNeedsVerification(true);
        setState({ kind: 'idle' });
      } else {
        setState({ kind: 'error', message: t('uploadError') });
      }
    } finally {
      abort.current = null;
    }
  }

  return {
    state,
    /** How many files this tile has uploaded -- drives the "Uploaded" confirmation. */
    uploadedCount,
    needsVerification,
    onFile: (file: File) => {
      if (!isAccepted(file)) {
        lastFile.current = null;
        setState({ kind: 'error', message: tUpload('typeError') });
        return;
      }
      void start(file);
    },
    onCancel: () => abort.current?.abort(),
    onRetry: () => {
      if (lastFile.current) void start(lastFile.current);
    },
  };
}
