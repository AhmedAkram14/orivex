'use client';

import { Upload } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { HealthGraphNode, MedicalRecordEntry, PatientDocument } from '@/features/patient/api/types';
import { CardHeaderLink } from '@/features/patient/components/overview-list';
import { DocumentRows } from '@/features/patient/components/records/document-list';
import { RecordKindIcon, visitSummary, type RecordKind } from '@/features/patient/components/records/record-kinds';
import { RecordList, RecordRow } from '@/features/patient/components/records/record-row';
import { ConditionMeta, ListSkeleton, ResultRow } from '@/features/patient/components/records/records-panels';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const MAX_ROWS = 3;
export const recordsTabHref = (tab: string, highlight?: string) =>
  `/patient/records?tab=${tab}${highlight ? `&highlight=${highlight}` : ''}`;

function OverviewCard({
  card,
  kind,
  title,
  viewAll,
  children,
}: {
  card: string;
  kind: RecordKind;
  title: string;
  /** "View all" to this tab, when there is more to see there. */
  viewAll?: { tab: string; context: string };
  children: ReactNode;
}) {
  const t = useTranslations('patient.records.overview');
  return (
    <WidgetContainer
      data-card={card}
      title={
        <span className="flex items-center gap-2 text-h3">
          <RecordKindIcon kind={kind} size="sm" />
          {title}
        </span>
      }
      titleAs="h3"
      actions={viewAll ? <CardHeaderLink href={recordsTabHref(viewAll.tab)} label={t('viewAll')} context={viewAll.context} /> : undefined}
    >
      {children}
    </WidgetContainer>
  );
}

export interface RecordsOverviewProps {
  conditions: MedicalRecordEntry[];
  latestVisit: MedicalRecordEntry | undefined;
  results: HealthGraphNode[];
  documents: PatientDocument[];
  loading: { records: boolean; results: boolean; documents: boolean };
  onUpload: () => void;
}

/**
 * "What matters now": the conditions on record, the latest visit, the latest results and documents -- one card
 * each, every record in at most one of them, the full history one "View all" away in its own tab. Two columns
 * from 1024px; cards in a row stretch to one height, so the columns end level.
 */
export function RecordsOverview({ conditions, latestVisit, results, documents, loading, onUpload }: RecordsOverviewProps) {
  const t = useTranslations('patient.records.overview');
  const tTabs = useTranslations('patient.records.tabs');
  const tDocuments = useTranslations('patient.records.documents');
  const format = useFormatter();

  return (
    <div className="grid grid-cols-1 gap-(--card-gap) [--card-head-gap:16px] max-sm:[--card-pad:20px] lg:grid-cols-2">
      <OverviewCard
        card="conditions"
        kind="condition"
        title={t('conditionsTitle')}
        viewAll={conditions.length > 0 ? { tab: 'conditions', context: tTabs('conditions') } : undefined}
      >
        {loading.records ? (
          <ListSkeleton />
        ) : conditions.length === 0 ? (
          <EmptyState illustration="records-start" size="sm" title={t('conditionsEmptyTitle')} description={t('conditionsEmptyDescription')} />
        ) : (
          <RecordList>
            {conditions.slice(0, MAX_ROWS).map((condition) => (
              <RecordRow key={condition.id} id={condition.id} kind="condition" title={condition.title} meta={<ConditionMeta condition={condition} />} />
            ))}
          </RecordList>
        )}
      </OverviewCard>

      <OverviewCard card="latest-visit" kind="visit" title={t('latestVisitTitle')}>
        {loading.records ? (
          <ListSkeleton rows={2} />
        ) : !latestVisit ? (
          <EmptyState illustration="calendar-clear" size="sm" title={t('noVisitTitle')} description={t('noVisitDescription')} />
        ) : (
          <div data-record-id={latestVisit.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {latestVisit.doctorName && (
                <span className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={latestVisit.doctorName} size="xs" />
                  <bdi className="truncate text-sm font-semibold text-text-primary">{latestVisit.doctorName}</bdi>
                </span>
              )}
              <time dateTime={latestVisit.date} className="text-xs text-text-tertiary">
                {format.dateTime(new Date(latestVisit.date), { year: 'numeric', month: 'short', day: 'numeric' })}
              </time>
            </div>
            <p dir="auto" className="line-clamp-2 text-sm text-text-secondary rtl:text-right">
              {visitSummary(latestVisit.description)}
            </p>
            <Link
              href={recordsTabHref('visits', latestVisit.id)}
              className="w-fit rounded-sm text-sm font-medium text-care-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {t('readFullNote')}
            </Link>
          </div>
        )}
      </OverviewCard>

      <OverviewCard
        card="recent-results"
        kind="result"
        title={t('resultsTitle')}
        viewAll={results.length > 0 ? { tab: 'results', context: tTabs('results') } : undefined}
      >
        {loading.results ? (
          <ListSkeleton />
        ) : results.length === 0 ? (
          <EmptyState illustration="labs-none" size="sm" title={t('resultsEmptyTitle')} description={t('resultsEmptyDescription')} />
        ) : (
          <RecordList>
            {results.slice(0, MAX_ROWS).map((node) => (
              <ResultRow key={node.id} node={node} kind={node.nodeType === 'lab_result' ? 'lab' : 'imaging'} />
            ))}
          </RecordList>
        )}
      </OverviewCard>

      <OverviewCard
        card="recent-documents"
        kind="document"
        title={t('documentsTitle')}
        viewAll={documents.length > 0 ? { tab: 'documents', context: tTabs('documents') } : undefined}
      >
        {loading.documents ? (
          <ListSkeleton />
        ) : documents.length === 0 ? (
          <EmptyState
            illustration="records-start"
            size="sm"
            title={t('documentsEmptyTitle')}
            description={t('documentsEmptyDescription')}
            action={
              <Button type="button" variant="secondary" size="sm" onClick={onUpload}>
                <Icon icon={Upload} size="sm" />
                {tDocuments('upload')}
              </Button>
            }
          />
        ) : (
          <DocumentRows documents={documents.slice(0, MAX_ROWS)} />
        )}
      </OverviewCard>
    </div>
  );
}
