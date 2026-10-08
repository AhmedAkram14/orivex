'use client';

import { Camera, CircleAlert, FileText, RefreshCw, TriangleAlert, Upload, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useRef, useState, type DragEvent } from 'react';
import type { UploadedDocument } from '@/shared/verification/types';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

export type UploadTileState =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'error'; message: string }
  | { kind: 'duplicate'; fileName: string; duplicateOf: string };

export interface UploadTileProps {
  label: string;
  description: string;
  /** e.g. "PDF, JPG or PNG". */
  typesHint: string;
  /** The file input's `accept`. */
  accept: string;
  /** Offer the phone camera (only shown on touch screens; images only). */
  allowCapture?: boolean;
  document: UploadedDocument | undefined;
  state: UploadTileState;
  onFile: (file: File) => void;
  onCancel: () => void;
  onRemove: () => void;
  onRetry: () => void;
  onConfirmDuplicate: () => void;
  onDiscardDuplicate: () => void;
}

/**
 * One document slot: a dashed drop zone to fill (drag a file in, browse, or -- on a phone -- take a photo), live
 * progress with Cancel while it uploads, then the file itself (a thumbnail for an image, a chip for a PDF) with
 * labelled Replace and Remove. Errors say why and offer Retry. Status changes are announced politely.
 */
export function UploadTile({
  label,
  description,
  typesHint,
  accept,
  allowCapture = true,
  document,
  state,
  onFile,
  onCancel,
  onRemove,
  onRetry,
  onConfirmDuplicate,
  onDiscardDuplicate,
}: UploadTileProps) {
  const t = useTranslations('ds.upload');
  const format = useFormatter();
  const labelId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const isImage = document?.contentType?.startsWith('image/');
  const size =
    document?.size !== undefined
      ? document.size >= 1024 * 1024
        ? format.number(document.size / (1024 * 1024), {
            style: 'unit',
            unit: 'megabyte',
            maximumFractionDigits: 1,
          })
        : format.number(Math.max(1, Math.round(document.size / 1024)), {
            style: 'unit',
            unit: 'kilobyte',
          })
      : undefined;

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (state.kind !== 'uploading') pick(event.dataTransfer.files);
  }

  const busy = state.kind === 'uploading';
  const empty = !document && !busy;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      data-upload-tile=""
      data-state={document ? 'uploaded' : state.kind}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-(--r-card) border bg-surface p-4 transition-colors duration-(--duration-fast)',
        empty ? 'border-dashed border-border-strong' : 'border-border-default',
        state.kind === 'error' && 'border-danger bg-danger-subtle/40',
        dragging && 'border-text-primary bg-surface-2',
      )}
    >
      <input
        ref={fileInput}
        type="file"
        accept={accept}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = '';
        }}
      />
      {allowCapture && (
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = '';
          }}
        />
      )}

      <div className="flex items-start gap-3">
        {document && isImage && document.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview of the picked file
          <img
            src={document.previewUrl}
            alt=""
            className="size-12 shrink-0 rounded-md object-cover ring-1 ring-border-strong"
          />
        ) : (
          <span
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-md',
              document
                ? 'bg-surface-2 text-text-primary ring-1 ring-border-strong'
                : 'bg-surface-2 text-text-secondary',
            )}
          >
            <Icon icon={FileText} size="md" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p id={labelId} className="text-sm font-semibold text-text-primary">
            {label}
          </p>
          {document ? (
            <p className="flex min-w-0 items-center gap-1.5 text-small text-text-secondary">
              <bdi className="truncate">{document.fileName}</bdi>
              {size && <span className="shrink-0 text-text-tertiary">· {size}</span>}
            </p>
          ) : (
            <>
              <p className="text-small text-text-secondary">{description}</p>
              <p className="text-caption text-text-tertiary">{typesHint}</p>
            </>
          )}
        </div>
      </div>

      {/* What happened, for screen readers too. */}
      <div aria-live="polite" className="flex flex-col gap-2">
        {state.kind === 'uploading' && (
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={t('uploadingLabel', { name: label })}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(state.progress * 100)}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className="h-full rounded-full bg-text-primary transition-[width] duration-(--duration-fast)"
                style={{ width: `${Math.round(state.progress * 100)}%` }}
              />
            </div>
            <span className="text-caption tabular-nums text-text-secondary">
              {format.number(state.progress, { style: 'percent' })}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <Icon icon={X} size="sm" />
              {t('cancel')}
            </Button>
          </div>
        )}
        {state.kind === 'error' && (
          <p className="flex items-start gap-1.5 text-small text-danger">
            <Icon icon={CircleAlert} size="sm" className="mt-px shrink-0" />
            {state.message}
          </p>
        )}
        {state.kind === 'duplicate' && (
          <p className="flex items-start gap-1.5 text-small text-warning-emphasis">
            <Icon icon={TriangleAlert} size="sm" className="mt-px shrink-0" />
            {t('duplicate', { name: state.duplicateOf })}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {state.kind === 'duplicate' ? (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={onDiscardDuplicate}>
              {t('chooseAnother')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onConfirmDuplicate}>
              {t('uploadAnyway')}
            </Button>
          </>
        ) : document ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              aria-label={t('replaceLabel', { name: label })}
              onClick={() => fileInput.current?.click()}
            >
              <Icon icon={RefreshCw} size="sm" />
              {t('replace')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label={t('removeLabel', { name: label })}
              onClick={onRemove}
            >
              <Icon icon={X} size="sm" />
              {t('remove')}
            </Button>
          </>
        ) : !busy ? (
          <>
            {state.kind === 'error' && (
              <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
                <Icon icon={RefreshCw} size="sm" />
                {t('retry')}
              </Button>
            )}
            <Button
              type="button"
              variant={state.kind === 'error' ? 'ghost' : 'secondary'}
              size="sm"
              aria-label={t('chooseLabel', { name: label })}
              onClick={() => fileInput.current?.click()}
            >
              <Icon icon={Upload} size="sm" />
              {t('choose')}
            </Button>
            {allowCapture && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden pointer-coarse:inline-flex"
                onClick={() => cameraInput.current?.click()}
              >
                <Icon icon={Camera} size="sm" />
                {t('takePhoto')}
              </Button>
            )}
            <span className="hidden text-caption text-text-tertiary pointer-fine:inline">
              {t('orDrop')}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
