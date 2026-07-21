'use client';

import { FileCheck2, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useUploadMediaAsset } from '@/shared/media/hooks/use-upload-media-asset';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export interface UploadedDocument {
  id: string;
  fileName: string;
}

export interface DocumentsStepProps {
  documents: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Doctor Onboarding (Phase 4 continuation): the wizard's document-upload
 * step -- reuses AssetModule's real upload-intent/PUT/confirm flow as-is
 * (`useUploadMediaAsset`), purpose `doctor_certificate`. Confirmed asset
 * ids feed directly into `POST /doctors/:id/verifications`'s
 * `documentAssetIds` -- no parallel storage, no draft-only local files.
 */
export function DocumentsStep({ documents, onDocumentsChange, onContinue, onBack }: DocumentsStepProps) {
  const t = useTranslations('doctor.onboarding.documentsStep');
  const upload = useUploadMediaAsset();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadError(undefined);
    try {
      const asset = await upload.mutateAsync({ file, purpose: 'doctor_certificate' });
      onDocumentsChange([...documents, { id: asset.id, fileName: file.name }]);
    } catch {
      setUploadError(t('uploadError'));
    }
  }

  function handleRemove(id: string) {
    onDocumentsChange(documents.filter((document) => document.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{t('description')}</p>

      {uploadError && <Alert variant="danger">{uploadError}</Alert>}

      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelected} />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
        <Icon icon={Upload} size="sm" />
        {t('uploadButton')}
      </Button>

      {documents.length > 0 && (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-default p-3"
            >
              <div className="flex items-center gap-2">
                <Icon icon={FileCheck2} size="sm" className="text-success" />
                <span className="text-sm text-text-primary">{document.fileName}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('remove')}
                onClick={() => handleRemove(document.id)}
              >
                <Icon icon={Trash2} size="sm" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button type="button" onClick={onContinue} disabled={documents.length === 0}>
          {t('continue')}
        </Button>
      </div>
    </div>
  );
}
