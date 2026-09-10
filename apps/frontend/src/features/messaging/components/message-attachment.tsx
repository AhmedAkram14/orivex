'use client';

import { Paperclip } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMediaAsset } from '@/shared/media/hooks/use-media-asset';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';

export interface MessageAttachmentProps {
  mediaAssetId: string;
}

/** A message's attachment, resolved to a real short-lived signed URL -- mirrors `VerificationDocumentViewer`'s own real-download-link pattern, just inline and compact for a chat bubble. */
export function MessageAttachment({ mediaAssetId }: MessageAttachmentProps) {
  const t = useTranslations('messaging.thread');
  const { data: asset, isLoading } = useMediaAsset(mediaAssetId, true);

  if (isLoading) {
    return <Skeleton className="h-8 w-32" />;
  }

  if (!asset?.signedUrl) {
    return null;
  }

  const isImage = asset.contentType.startsWith('image/');

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a short-lived, party-authorized presigned S3 URL, not a Next-optimizable static asset.
      <img src={asset.signedUrl} alt={t('attachmentAlt')} className="max-h-48 w-auto rounded-md border border-border-default object-contain" />
    );
  }

  return (
    <a
      href={asset.signedUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
    >
      <Icon icon={Paperclip} size="sm" />
      {t('openAttachment')}
    </a>
  );
}
