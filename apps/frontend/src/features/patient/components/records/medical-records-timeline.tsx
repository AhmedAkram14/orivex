'use client';

import { useFormatter, useTranslations } from 'next-intl';
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

  if (entries.length === 0) {
    return <EmptyState title={t('timelineEmptyTitle')} description={t('timelineEmptyDescription')} />;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <ol className="flex flex-col">
      {sorted.map((entry, index) => (
        <li key={entry.id}>
          <RecordTimelineEntry
            dateLabel={format.dateTime(new Date(entry.date), { year: 'numeric', month: 'short', day: 'numeric' })}
            type={entry.type}
            typeLabel={tType(entry.type)}
            title={entry.title}
            description={entry.description}
            doctorName={entry.doctorName}
            isLast={index === sorted.length - 1}
            actions={
              entry.downloadUrl ? <RecordDownloadButton href={entry.downloadUrl} label={t('download')} /> : undefined
            }
          />
        </li>
      ))}
    </ol>
  );
}
