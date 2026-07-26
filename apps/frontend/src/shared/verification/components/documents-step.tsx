'use client';

import { FileCheck2, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useUploadMediaAsset } from '@/shared/media/hooks/use-upload-media-asset';
import type { MediaAssetPurpose } from '@/shared/media/types';
import type { UploadedDocument } from '@/shared/verification/types';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export type DocumentSlots = Partial<Record<MediaAssetPurpose, UploadedDocument>>;

export interface DocumentsStepProps {
  /** Which MediaAssetPurpose values this wizard needs, in display order -- 7 for Doctor Onboarding, 3 for Patient Identity Verification. */
  slots: readonly MediaAssetPurpose[];
  /** The `next-intl` namespace this step's own strings live under (`description`/`uploadError`/`slots.*`/`uploadButton`/`remove`/`back`/`continue`) -- lets Doctor and Patient each keep their own copy without duplicating this component. */
  translationNamespace: string;
  documents: DocumentSlots;
  onDocumentsChange: (documents: DocumentSlots) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.6/O.7): the shared
 * document-upload step for both Doctor Onboarding (7 slots) and Patient
 * Identity Verification (3 slots: National ID Front/Back, Selfie with ID) --
 * reuses AssetModule's real upload-intent/PUT/confirm flow as-is
 * (`useUploadMediaAsset`), one call per slot. Confirmed asset ids feed
 * directly into the subject's own `POST .../verifications`' `documentAssetIds`
 * -- no parallel storage, no draft-only local files. Every slot passed in is
 * required -- `Continue` stays blocked until all of them have a confirmed
 * upload.
 */
export function DocumentsStep({ slots, translationNamespace, documents, onDocumentsChange, onContinue, onBack }: DocumentsStepProps) {
  const t = useTranslations(translationNamespace);
  const upload = useUploadMediaAsset();
  const inputRefs = useRef<Partial<Record<MediaAssetPurpose, HTMLInputElement | null>>>({});
  const [uploadingSlot, setUploadingSlot] = useState<MediaAssetPurpose | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);

  const allSlotsFilled = slots.every((slot) => documents[slot]);

  async function handleFileSelected(purpose: MediaAssetPurpose, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadError(undefined);
    setUploadingSlot(purpose);
    try {
      const asset = await upload.mutateAsync({ file, purpose });
      onDocumentsChange({ ...documents, [purpose]: { id: asset.id, fileName: file.name } });
    } catch {
      setUploadError(t('uploadError'));
    } finally {
      setUploadingSlot(undefined);
    }
  }

  function handleRemove(purpose: MediaAssetPurpose) {
    const next = { ...documents };
    delete next[purpose];
    onDocumentsChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{t('description')}</p>

      {uploadError && <Alert variant="danger">{uploadError}</Alert>}

      <ul className="flex flex-col gap-2">
        {slots.map((slot) => {
          const document = documents[slot];
          return (
            <li key={slot} className="flex items-center justify-between gap-3 rounded-lg border border-border-default p-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-text-primary">{t(`slots.${slot}`)}</span>
                {document && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Icon icon={FileCheck2} size="sm" className="text-success" />
                    {document.fileName}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={(element) => {
                    inputRefs.current[slot] = element;
                  }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(event) => handleFileSelected(slot, event)}
                />
                {document ? (
                  <Button type="button" variant="ghost" size="icon" aria-label={t('remove')} onClick={() => handleRemove(slot)}>
                    <Icon icon={Trash2} size="sm" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={uploadingSlot === slot}
                    onClick={() => inputRefs.current[slot]?.click()}
                  >
                    <Icon icon={Upload} size="sm" />
                    {t('uploadButton')}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button type="button" onClick={onContinue} disabled={!allSlotsFilled}>
          {t('continue')}
        </Button>
      </div>
    </div>
  );
}
