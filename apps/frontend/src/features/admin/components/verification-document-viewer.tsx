'use client';

import { useTranslations } from 'next-intl';
import { useMediaAsset } from '@/shared/media/hooks/use-media-asset';
import { Alert } from '@/shared/ui/alert';
import { Card, CardContent } from '@/shared/ui/card';
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
    <Card>
      <CardContent className="flex flex-col gap-2 p-3">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {!asset.signedUrl && <p className="text-sm text-text-secondary">{t('notYetAvailable')}</p>}
        {asset.signedUrl && isImage && (
          // The document fills its card (a fixed-height, letterboxed frame -- a 256px-tall thumbnail in a wide card
          // was too small to read) and opens full size in a new tab.
          <a
            href={asset.signedUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative block overflow-hidden rounded-md border border-border-default bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived, admin-authorized presigned S3 URL, not a Next-optimizable static asset. */}
            <img src={asset.signedUrl} alt={label} className="h-80 w-full object-contain @xl:h-96" />
            <span className="absolute inset-e-2 bottom-2 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-text-primary shadow-xs">
              {t('openFullSize')}
            </span>
          </a>
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
      </CardContent>
    </Card>
  );
}
