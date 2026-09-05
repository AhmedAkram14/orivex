'use client';

import { FileCheck2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { IdentityVerificationGate } from '@/features/patient/components/identity-verification/identity-verification-gate';
import { useUploadMediaAsset } from '@/shared/media/hooks/use-upload-media-asset';
import { ApiError } from '@/shared/lib/api/client';
import { SHARED_ERROR_CODES } from '@/shared/lib/api/error-codes';
import { usePathname } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.7): a minimal, generic
 * "upload a clinical document" control -- just enough surface to exercise
 * the real backend gate (`POST /media-assets/upload-intent` with purpose
 * `clinical_attachment`, gated for an unverified Patient since Stage O.4)
 * end to end. Deliberately not a full Lab Results/Imaging feature -- those
 * stay `LabImagingPlaceholders`' honest not-yet-available state; this is
 * only the fourth gated action's real, reachable entry point.
 */
export function ClinicalDocumentUpload() {
  const t = useTranslations('patient.records.clinicalUpload');
  const pathname = usePathname();
  const upload = useUploadMediaAsset();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | undefined>(undefined);

  const gateError =
    upload.error instanceof ApiError && upload.error.code === SHARED_ERROR_CODES.identityVerificationRequired
      ? upload.error
      : undefined;

  if (gateError) {
    return <IdentityVerificationGate action="documentUpload" returnTo={pathname} />;
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      await upload.mutateAsync({ file, purpose: 'clinical_attachment' });
      setUploadedFileName(file.name);
    } catch {
      // Inline error rendered below from `upload.error` (or the gate above).
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {upload.isError && !gateError && <Alert variant="danger">{t('uploadError')}</Alert>}

      {uploadedFileName && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Icon icon={FileCheck2} size="sm" className="text-success" />
          {uploadedFileName}
        </div>
      )}

      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelected} />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
        <Icon icon={Upload} size="sm" />
        {t('uploadButton')}
      </Button>
    </div>
  );
}
