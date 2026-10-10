'use client';

import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IdentityVerificationGate } from '@/features/patient/components/identity-verification/identity-verification-gate';
import { DOCUMENT_ACCEPT, useDocumentUpload } from '@/features/patient/components/records/use-document-upload';
import { usePathname } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { UploadTile } from '@/shared/verification/components/upload-tile';

const noop = () => {};

/**
 * The one place a patient adds a document: the doctor application's upload tile (drop, browse or -- on a
 * phone -- take a photo, live progress with Cancel, a type error with Retry), reset after each upload so the
 * next file can follow, with a polite "Uploaded" line. Used at the start of the Documents grid and inside the
 * header's Upload document dialog. An unverified patient sees the identity-verification gate instead.
 */
export function DocumentUploadTile({ className }: { className?: string }) {
  const t = useTranslations('patient.records.documents');
  const tUpload = useTranslations('ds.upload');
  const pathname = usePathname();
  const upload = useDocumentUpload();

  if (upload.needsVerification) {
    return <IdentityVerificationGate action="documentUpload" returnTo={pathname} />;
  }

  return (
    <div className={className}>
      <UploadTile
        label={t('tileLabel')}
        description={t('tileDescription')}
        typesHint={tUpload('types')}
        accept={DOCUMENT_ACCEPT}
        document={undefined}
        state={upload.state}
        onFile={upload.onFile}
        onCancel={upload.onCancel}
        onRetry={upload.onRetry}
        onRemove={noop}
        onConfirmDuplicate={noop}
        onDiscardDuplicate={noop}
      />
      <p aria-live="polite" className="mt-2 flex min-h-5 items-center gap-1.5 text-small text-success-emphasis">
        {upload.uploadedCount > 0 && upload.state.kind === 'idle' && (
          <>
            <Icon icon={CircleCheck} size="sm" />
            {t('uploaded', { count: upload.uploadedCount })}
          </>
        )}
      </p>
    </div>
  );
}
