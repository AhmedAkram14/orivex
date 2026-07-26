'use client';

import { useTranslations } from 'next-intl';
import { useMediaAsset } from '@/shared/media/hooks/use-media-asset';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';

export interface VerificationDocumentViewerProps {
  mediaAssetId: string;
}

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): a
 * real, authorized document preview -- every render mints a fresh signed
 * download URL via `GET /media-assets/:id` (owner-or-SuperAdmin, enforced
 * backend-side), never a raw/cached storage URL. Images render inline;
 * anything else (PDFs) gets a real "Open document" link to the signed URL,
 * which the browser opens/downloads per its own PDF handling.
 */
export function VerificationDocumentViewer({ mediaAssetId }: VerificationDocumentViewerProps) {
  const t = useTranslations('admin.verificationCase.documents');
  const { data: asset, isLoading, isError } = useMediaAsset(mediaAssetId, true);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (isError || !asset) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const isImage = asset.contentType.startsWith('image/');
  const label = t(`purpose.${asset.purpose}`);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-default p-3">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      {!asset.signedUrl && <p className="text-sm text-text-secondary">{t('notYetAvailable')}</p>}
      {asset.signedUrl && isImage && (
        // eslint-disable-next-line @next/next/no-img-element -- a short-lived, admin-authorized presigned S3 URL, not a Next-optimizable static asset.
        <img src={asset.signedUrl} alt={label} className="max-h-64 w-auto rounded-md border border-border-default object-contain" />
      )}
      {asset.signedUrl && !isImage && (
        <a
          href={asset.signedUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-primary underline underline-offset-2"
        >
          {t('openDocument')}
        </a>
      )}
    </div>
  );
}
