'use client';

import { FlaskConical, ScanLine } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import type { HealthGraphNode, MedicalRecordEntry, PatientDocument } from '@/features/patient/api/types';
import { DocumentCard } from '@/features/patient/components/records/document-list';
import { DocumentUploadTile } from '@/features/patient/components/records/document-upload-tile';
import { RecordKindIcon } from '@/features/patient/components/records/record-kinds';
import { RecordList, RecordRow } from '@/features/patient/components/records/record-row';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

export function useRecordDate() {
  const format = useFormatter();
  return (iso: string) => format.dateTime(new Date(iso), { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** "Recorded Jul 2, 2026 · Dr. Salma Adel" -- the doctor isolated, so a Latin name never reorders Arabic text. */
export function ConditionMeta({ condition }: { condition: MedicalRecordEntry }) {
  const t = useTranslations('patient.records.conditions');
  const date = useRecordDate()(condition.date);
  return (
    <>
      {t('recordedOn', { date })}
      {condition.doctorName && (
        <>
          {' · '}
          <bdi>{condition.doctorName}</bdi>
        </>
      )}
    </>
  );
}

/**
 * Every condition on record, newest first. The record has no active/resolved status (HealthGraphNode carries
 * none), so this is one list by recorded date -- never an "Active" group the data can't back -- and no link to
 * a visit (the entry doesn't say which visit recorded it).
 */
export function ConditionsPanel({ conditions, highlightId }: { conditions: MedicalRecordEntry[]; highlightId?: string | null }) {
  const t = useTranslations('patient.records.conditions');
  useEffect(() => {
    if (highlightId) document.querySelector(`[data-record-id="${highlightId}"]`)?.scrollIntoView?.({ block: 'center' });
  }, [highlightId]);

  if (conditions.length === 0) {
    return <EmptyState illustration="records-start" title={t('emptyTitle')} description={t('emptyDescription')} />;
  }
  const sorted = [...conditions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <WidgetContainer
      title={<span className="flex items-center gap-2 text-h3"><RecordKindIcon kind="condition" size="sm" />{t('title')}</span>}
      titleAs="h3"
      description={t('description')}
    >
      <RecordList>
        {sorted.map((condition) => (
          <RecordRow
            key={condition.id}
            id={condition.id}
            kind="condition"
            title={condition.title}
            meta={<ConditionMeta condition={condition} />}
            highlighted={condition.id === highlightId}
          />
        ))}
      </RecordList>
    </WidgetContainer>
  );
}

/**
 * The patient's documents: the upload tile first (the only action surface on this page besides the header's
 * button), then every document, newest first.
 */
export function DocumentsPanel({ documents, loading }: { documents: PatientDocument[]; loading: boolean }) {
  const t = useTranslations('patient.records.documents');
  return (
    <ul className="grid grid-cols-1 items-start gap-(--card-gap) sm:grid-cols-2 lg:grid-cols-3" aria-label={t('listLabel')}>
      <li className="min-w-0">
        <DocumentUploadTile />
      </li>
      {loading ? (
        <li className="min-w-0">
          <Skeleton className="h-28 w-full rounded-(--r-card)" />
        </li>
      ) : documents.length === 0 ? (
        <li className="flex min-h-28 min-w-0 items-center justify-center rounded-(--r-card) border border-dashed border-border-default p-4 text-center text-small text-text-tertiary sm:col-span-1 lg:col-span-2">
          {t('emptyList')}
        </li>
      ) : (
        documents.map((document) => <DocumentCard key={document.id} document={document} />)
      )}
    </ul>
  );
}

export function ResultRow({ node, kind }: { node: HealthGraphNode; kind: 'lab' | 'imaging' }) {
  const t = useTranslations('patient.records.results');
  const date = useRecordDate()(node.createdAt);
  return (
    <RecordRow
      id={node.id}
      kind="result"
      icon={kind === 'lab' ? FlaskConical : ScanLine}
      title={node.description ?? t(kind === 'lab' ? 'untitledLab' : 'untitledImaging')}
      meta={
        <>
          <bdi>{date}</bdi>
          {' · '}
          {t(`source.${node.source}`)}
        </>
      }
    />
  );
}

/**
 * Lab results and imaging, each in its own card: the patient's own `lab_result` / `radiology_result` health-graph
 * nodes. They carry a description and a date only -- no value, reference range or image -- so rows are text,
 * with no range bar or thumbnail drawn from data that isn't there.
 */
export function ResultsPanel({ labs, imaging, loading }: { labs: HealthGraphNode[]; imaging: HealthGraphNode[]; loading: boolean }) {
  const t = useTranslations('patient.records.results');
  const sections = [
    { key: 'lab' as const, title: t('labsTitle'), icon: FlaskConical, nodes: labs, empty: t('labsEmptyTitle') },
    { key: 'imaging' as const, title: t('imagingTitle'), icon: ScanLine, nodes: imaging, empty: t('imagingEmptyTitle') },
  ];
  return (
    <div className="grid grid-cols-1 gap-(--card-gap) lg:grid-cols-2">
      {sections.map((section) => (
        <WidgetContainer
          key={section.key}
          title={<span className="flex items-center gap-2 text-h3"><RecordKindIcon kind="result" icon={section.icon} size="sm" />{section.title}</span>}
          titleAs="h3"
        >
          {loading ? (
            <ListSkeleton rows={2} />
          ) : section.nodes.length === 0 ? (
            <EmptyState illustration="labs-none" size="sm" title={section.empty} description={t('emptyDescription')} />
          ) : (
            <RecordList>
              {section.nodes.map((node) => (
                <ResultRow key={node.id} node={node} kind={section.key} />
              ))}
            </RecordList>
          )}
        </WidgetContainer>
      ))}
    </div>
  );
}
