'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import type { MedicalRecordEntry } from '@/features/patient/api/types';
import { EmptyState } from '@/shared/ui/empty-state';
import { RecordDownloadButton } from '@/shared/ui/timeline/record-download-button';
import { RecordTimelineEntry } from '@/shared/ui/timeline/record-timeline-entry';

export interface MedicalRecordsTimelineProps {
  entries: MedicalRecordEntry[];
}

/** Renders the Medical Records timeline architecture from real `MedicalRecordEntry` data, newest first — the shared rendering the (unfiltered) full timeline and any type-filtered view both use. */
export function MedicalRecordsTimeline({ entries }: MedicalRecordsTimelineProps) {
  const t = useTranslations('patient.records');
  const tType = useTranslations('patient.records.type');
  const format = useFormatter();
  // `?highlight=<entryId>` (from a dashboard record link): scroll that entry into view.
  const highlightId = useSearchParams().get('highlight');
  useEffect(() => {
    if (highlightId) document.getElementById(`record-${highlightId}`)?.scrollIntoView?.({ block: 'center' });
  }, [highlightId, entries.length]);

  if (entries.length === 0) {
    return <EmptyState title={t('timelineEmptyTitle')} description={t('timelineEmptyDescription')} />;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <ol className="flex flex-col">
      {sorted.map((entry, index) => (
        <li key={entry.id} id={`record-${entry.id}`} className="scroll-mt-24">
          <RecordTimelineEntry
            className={entry.id === highlightId ? 'rounded-lg ring-2 ring-focus-ring' : undefined}
            dateLabel={format.dateTime(new Date(entry.date), { year: 'numeric', month: 'short', day: 'numeric' })}
            type={entry.type}
            typeLabel={tType(entry.type)}
            title={entry.title}
            description={entry.description}
            doctorName={entry.doctorName}
            isLast={index === sorted.length - 1}
            viewDetailsLabel={t('viewDetails')}
            showLessLabel={t('showLess')}
            actions={
              entry.downloadUrl ? <RecordDownloadButton href={entry.downloadUrl} label={t('download')} /> : undefined
            }
          />
        </li>
      ))}
    </ol>
  );
}
