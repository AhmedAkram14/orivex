'use client';

import { ExternalLink, FileText, ImageIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { PatientDocument } from '@/features/patient/api/types';
import { fileFormatLabel, RECORD_KINDS } from '@/features/patient/components/records/record-kinds';
import { RecordList, RecordRow } from '@/features/patient/components/records/record-row';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export function useDocumentText(document: PatientDocument) {
  const t = useTranslations('patient.records.documents');
  const format = useFormatter();
  const date = format.dateTime(new Date(document.createdAt), { year: 'numeric', month: 'short', day: 'numeric' });
  return {
    // The asset has no file name: it is told apart by what it is, its format and its date.
    title: t(`purpose.${document.purpose}`),
    // Each part isolated: a Latin format beside an Arabic date never reorders.
    meta: (
      <>
        <bdi>{fileFormatLabel(document.contentType)}</bdi>
        {' · '}
        <bdi>{date}</bdi>
      </>
    ),
    date,
  };
}

/** View the file (a short-lived link, opened in a new tab), or say it isn't ready yet. */
export function DocumentViewLink({ document, title, date }: { document: PatientDocument; title: string; date: string }) {
  const t = useTranslations('patient.records.documents');
  if (!document.signedUrl) return <span className="text-caption text-text-tertiary">{t('notAvailable')}</span>;
  return (
    <a
      href={document.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('viewLabel', { name: title, date })}
      className="inline-flex h-8 items-center gap-1 rounded-sm text-sm font-medium text-care-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      {t('view')}
      <Icon icon={ExternalLink} size="xs" />
    </a>
  );
}

/** A compact row (Overview > Recent documents). */
export function DocumentRow({ document }: { document: PatientDocument }) {
  const text = useDocumentText(document);
  return (
    <RecordRow
      id={document.id}
      kind="document"
      icon={document.contentType.startsWith('image/') ? ImageIcon : FileText}
      title={text.title}
      meta={text.meta}
      trailing={<DocumentViewLink document={document} title={text.title} date={text.date} />}
    />
  );
}

export function DocumentRows({ documents, label }: { documents: PatientDocument[]; label?: string }) {
  return (
    <RecordList label={label}>
      {documents.map((document) => (
        <DocumentRow key={document.id} document={document} />
      ))}
    </RecordList>
  );
}

/**
 * A document in the Documents grid: a thumbnail for an image (its own file, when the link is live), a format
 * chip for a PDF, then what it is, its format and date, and View.
 */
export function DocumentCard({ document }: { document: PatientDocument }) {
  const text = useDocumentText(document);
  const [thumbFailed, setThumbFailed] = useState(false);
  const isImage = document.contentType.startsWith('image/');
  const showThumb = isImage && document.signedUrl && !thumbFailed;

  return (
    <li data-record-id={document.id} className="flex min-w-0 flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-4">
      <div className="flex items-start gap-3">
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link to the patient's own file
          <img
            src={document.signedUrl!}
            alt=""
            onError={() => setThumbFailed(true)}
            className="size-12 shrink-0 rounded-md object-cover ring-1 ring-border-default"
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn('flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md', RECORD_KINDS.document.tint)}
          >
            <Icon icon={isImage ? ImageIcon : FileText} size="sm" />
            <span className="text-[0.625rem] font-semibold leading-none">{fileFormatLabel(document.contentType)}</span>
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-text-primary">{text.title}</p>
          <p className="text-xs text-text-tertiary">{text.meta}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <DocumentViewLink document={document} title={text.title} date={text.date} />
      </div>
    </li>
  );
}
