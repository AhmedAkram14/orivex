'use client';

import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { UploadCancelledError, useUploadMediaAsset } from '@/shared/media/hooks/use-upload-media-asset';
import type { MediaAssetPurpose } from '@/shared/media/types';
import type { UploadedDocument } from '@/shared/verification/types';
import { UploadTile, type UploadTileState } from '@/shared/verification/components/upload-tile';
import { Icon } from '@/shared/icons/icon';
import { ActionBar } from '@/shared/ui/action-bar';
import { Button } from '@/shared/ui/button';

export type DocumentSlots = Partial<Record<MediaAssetPurpose, UploadedDocument>>;

export interface DocumentGroup {
  /** Key under the namespace's `groups.*`. */
  key: string;
  slots: readonly MediaAssetPurpose[];
}

export interface DocumentsStepProps {
  /** Which MediaAssetPurpose values this wizard needs, in display order -- 7 for Doctor Onboarding, 3 for Patient Identity Verification. */
  slots: readonly MediaAssetPurpose[];
  /** Optional headed groups of `slots` (e.g. Identity / Qualifications); one unheaded group when omitted. */
  groups?: readonly DocumentGroup[];
  /**
   * The `next-intl` namespace this step's own strings live under (`heading`/`progress`/`uploadError`/`privacy`/
   * `slots.*`/`descriptions.*`/`groups.*`/`back`/`continue`) -- lets Doctor and Patient each keep their own copy.
   */
  translationNamespace: string;
  documents: DocumentSlots;
  onDocumentsChange: (documents: DocumentSlots) => void;
  onContinue: () => void;
  onBack: () => void;
}

// The same three types the file picker has always offered (`accept`); checked again for dropped files. The API sets
// no type or size limit of its own.
const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

// A local preview of the picked file; optional (never a reason for an upload to fail).
function previewOf(file: File): string | undefined {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined;
}

function release(url: string | undefined) {
  if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
}

function isAccepted(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.test(file.name);
}

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.6/O.7): the shared document-upload step for both Doctor
 * Onboarding (7 slots) and Patient Identity Verification (3 slots) -- reuses AssetModule's real
 * upload-intent/PUT/confirm flow as-is (`useUploadMediaAsset`), one call per slot, now with progress and Cancel.
 * Confirmed asset ids feed directly into the subject's own `POST .../verifications`' `documentAssetIds` -- no
 * parallel storage. Every slot is required: Continue stays blocked until all of them have a confirmed upload.
 *
 * Picking a file that looks like one already used for another slot (same name and size) warns first and lets the
 * applicant upload it anyway or choose another -- the API itself doesn't check.
 */
export function DocumentsStep({ slots, groups, translationNamespace, documents, onDocumentsChange, onContinue, onBack }: DocumentsStepProps) {
  const t = useTranslations(translationNamespace);
  const tUpload = useTranslations('ds.upload');
  const upload = useUploadMediaAsset();
  const [tileStates, setTileStates] = useState<Partial<Record<MediaAssetPurpose, UploadTileState>>>({});
  // The latest documents, updated immediately (two uploads can finish in the same tick).
  const documentsRef = useRef(documents);
  documentsRef.current = documents;
  const aborts = useRef<Partial<Record<MediaAssetPurpose, AbortController>>>({});
  const pending = useRef<Partial<Record<MediaAssetPurpose, File>>>({});

  // Cancel anything still uploading when the step goes away.
  useEffect(
    () => () => {
      Object.values(aborts.current).forEach((controller) => controller?.abort());
    },
    [],
  );

  const done = slots.filter((slot) => documents[slot]).length;
  const allSlotsFilled = done === slots.length;
  const sections: readonly DocumentGroup[] = groups ?? [{ key: '', slots }];

  function setTile(slot: MediaAssetPurpose, state: UploadTileState) {
    setTileStates((current) => ({ ...current, [slot]: state }));
  }

  function setDocuments(next: DocumentSlots) {
    documentsRef.current = next;
    onDocumentsChange(next);
  }

  async function startUpload(slot: MediaAssetPurpose, file: File) {
    const controller = new AbortController();
    aborts.current[slot] = controller;
    pending.current[slot] = file;
    setTile(slot, { kind: 'uploading', progress: 0 });
    try {
      const asset = await upload.mutateAsync({
        file,
        purpose: slot,
        signal: controller.signal,
        onProgress: (progress) => setTile(slot, { kind: 'uploading', progress }),
      });
      const previous = documentsRef.current[slot];
      release(previous?.previewUrl);
      setDocuments({
        ...documentsRef.current,
        [slot]: { id: asset.id, fileName: file.name, size: file.size, contentType: file.type, previewUrl: previewOf(file) },
      });
      delete pending.current[slot];
      setTile(slot, { kind: 'idle' });
    } catch (error) {
      if (error instanceof UploadCancelledError) {
        delete pending.current[slot];
        setTile(slot, { kind: 'idle' });
      } else {
        setTile(slot, { kind: 'error', message: t('uploadError') });
      }
    } finally {
      delete aborts.current[slot];
    }
  }

  function handleFile(slot: MediaAssetPurpose, file: File) {
    if (!isAccepted(file)) {
      setTile(slot, { kind: 'error', message: tUpload('typeError') });
      return;
    }
    const twin = slots.find((other) => other !== slot && documentsRef.current[other]?.fileName === file.name && documentsRef.current[other]?.size === file.size);
    if (twin) {
      pending.current[slot] = file;
      setTile(slot, { kind: 'duplicate', fileName: file.name, duplicateOf: t(`slots.${twin}`) });
      return;
    }
    void startUpload(slot, file);
  }

  function handleRemove(slot: MediaAssetPurpose) {
    const next = { ...documentsRef.current };
    release(next[slot]?.previewUrl);
    delete next[slot];
    setDocuments(next);
    setTile(slot, { kind: 'idle' });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{t('heading', { total: slots.length })}</span>
          {' · '}
          <span aria-live="polite">{t('progress', { done, total: slots.length })}</span>
        </p>
        <div
          role="progressbar"
          aria-label={t('progress', { done, total: slots.length })}
          aria-valuemin={0}
          aria-valuemax={slots.length}
          aria-valuenow={done}
          className="h-1 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-text-primary transition-[width] duration-(--duration-base)" style={{ width: `${(done / slots.length) * 100}%` }} />
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.key || 'all'} className="flex flex-col gap-3" aria-labelledby={section.key ? `documents-${section.key}` : undefined}>
          {section.key && (
            <h2 id={`documents-${section.key}`} className="text-small font-semibold text-text-secondary">
              {t(`groups.${section.key}`)}
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {section.slots.map((slot) => (
              <UploadTile
                key={slot}
                label={t(`slots.${slot}`)}
                description={t(`descriptions.${slot}`)}
                typesHint={tUpload('types')}
                accept={ACCEPT}
                document={documents[slot]}
                state={tileStates[slot] ?? { kind: 'idle' }}
                onFile={(file) => handleFile(slot, file)}
                onCancel={() => aborts.current[slot]?.abort()}
                onRemove={() => handleRemove(slot)}
                onRetry={() => {
                  const file = pending.current[slot];
                  if (file) void startUpload(slot, file);
                }}
                onConfirmDuplicate={() => {
                  const file = pending.current[slot];
                  if (file) void startUpload(slot, file);
                }}
                onDiscardDuplicate={() => {
                  delete pending.current[slot];
                  setTile(slot, { kind: 'idle' });
                }}
              />
            ))}
          </div>
        </section>
      ))}

      <p className="flex items-start gap-1.5 text-xs text-text-tertiary">
        <Icon icon={ShieldCheck} size="xs" className="mt-px shrink-0" />
        {t('privacy')}
      </p>

      <ActionBar
        start={
          <Button type="button" variant="secondary" onClick={onBack}>
            <Icon icon={ArrowLeft} size="sm" flipRtl />
            {t('back')}
          </Button>
        }
        end={
          <Button type="button" onClick={onContinue} disabled={!allSlotsFilled}>
            {t('continue')}
            <Icon icon={ArrowRight} size="sm" flipRtl />
          </Button>
        }
      />
    </div>
  );
}
