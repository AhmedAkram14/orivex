'use client';

import { ArrowRight, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { RecordKindIcon, type RecordKind } from '@/features/patient/components/records/record-kinds';
import { RecordsOverview } from '@/features/patient/components/records/records-overview';
import { ConditionsPanel, DocumentsPanel, ResultsPanel } from '@/features/patient/components/records/records-panels';
import { RecordsSummary } from '@/features/patient/components/records/records-summary';
import { UploadDocumentDialog } from '@/features/patient/components/records/upload-document-dialog';
import { VisitsTimeline } from '@/features/patient/components/records/visits-timeline';
import { usePatientDocuments } from '@/features/patient/hooks/use-patient-documents';
import { usePatientHealthResults } from '@/features/patient/hooks/use-patient-health-results';
import { usePatientMedicalRecords } from '@/features/patient/hooks/use-patient-medical-records';
import { RequireRole } from '@/shared/auth/require-role';
import { Icon } from '@/shared/icons/icon';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

const TABS = ['overview', 'visits', 'conditions', 'documents', 'results'] as const;
type RecordsTab = (typeof TABS)[number];
const KIND_BY_TAB: Partial<Record<RecordsTab, RecordKind>> = { visits: 'visit', conditions: 'condition', documents: 'document', results: 'result' };

const newestFirst = <T extends { date: string }>(a: T, b: T) => new Date(b.date).getTime() - new Date(a.date).getTime();

/**
 * The Patient Portal's Medical Records page: one place per kind of record.
 *
 * - The header carries the page's one write action, Upload document (a dialog, from any tab).
 * - The summary strip counts visits, conditions and documents and names the last visit -- every figure from
 *   the same lists the tabs show.
 * - Tabs, kept in the URL (`?tab=visits`, pushed so Back walks them): Overview (current state, nothing twice),
 *   then the full history of each kind. `?highlight=<id>` (a dashboard or Overview link) opens the tab that
 *   holds that record and rings it.
 *
 * Data: `GET /patients/me/medical-records` (visits and conditions), `GET /patients/me/documents` and the
 * patient's own health graph for lab and imaging results. Medications live on Prescriptions, linked from the
 * tab bar.
 */
export default function PatientMedicalRecordsPage() {
  const t = useTranslations('patient.records');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const records = usePatientMedicalRecords();
  const documents = usePatientDocuments();
  const results = usePatientHealthResults();
  const [uploadOpen, setUploadOpen] = useState(false);
  const tabsListRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => records.data ?? [], [records.data]);
  const visits = useMemo(() => entries.filter((entry) => entry.type === 'visit').sort(newestFirst), [entries]);
  const conditions = useMemo(() => entries.filter((entry) => entry.type === 'condition').sort(newestFirst), [entries]);
  const documentList = documents.data ?? [];
  const labs = useMemo(() => results.data?.labs ?? [], [results.data]);
  const imaging = useMemo(() => results.data?.imaging ?? [], [results.data]);
  const latestResults = useMemo(
    () => [...labs, ...imaging].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [labs, imaging],
  );

  const highlightId = searchParams.get('highlight');
  const tabParam = searchParams.get('tab');
  const highlighted = highlightId ? entries.find((entry) => entry.id === highlightId) : undefined;
  const activeTab: RecordsTab = TABS.includes(tabParam as RecordsTab)
    ? (tabParam as RecordsTab)
    : highlighted
      ? highlighted.type === 'visit'
        ? 'visits'
        : 'conditions'
      : 'overview';

  const counts: Record<RecordsTab, number | undefined> = {
    overview: undefined,
    visits: records.isLoading ? undefined : visits.length,
    conditions: records.isLoading ? undefined : conditions.length,
    documents: documents.isLoading ? undefined : documentList.length,
    results: results.isLoading ? undefined : labs.length + imaging.length,
  };

  // The active tab stays in view in the sideways-scrolling tab bar on a phone.
  useEffect(() => {
    tabsListRef.current?.querySelector<HTMLElement>('[data-state="active"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [activeTab]);

  function selectTab(next: string) {
    // Pushed, not replaced: Back returns to the previous tab. A highlight belongs to the link that set it.
    router.push(`${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader
          breadcrumbs={<AppBreadcrumbs />}
          title={t('title')}
          description={t('description')}
          actions={
            <Button type="button" variant="secondary" onClick={() => setUploadOpen(true)}>
              <Icon icon={Upload} size="sm" />
              {t('documents.upload')}
            </Button>
          }
        />

        {records.isError && <Alert variant="danger">{t('loadError')}</Alert>}

        <RecordsSummary
          visitCount={visits.length}
          conditionCount={conditions.length}
          documentCount={documentList.length}
          lastVisitAt={visits[0]?.date}
          loading={{ records: records.isLoading, documents: documents.isLoading }}
        />

        <Tabs value={activeTab} onValueChange={selectTab} className="flex flex-col gap-(--card-gap)">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {/* A phone scrolls the tab bar sideways; the page itself never does. */}
            <div className="-mx-1 max-w-full overflow-x-auto px-1 py-1 scrollbar-none">
              <TabsList ref={tabsListRef} aria-label={t('tabs.label')} className="flex w-max">
                {TABS.map((tab) => {
                  const kind = KIND_BY_TAB[tab];
                  const count = counts[tab];
                  return (
                    <TabsTrigger key={tab} value={tab} data-tab={tab} data-count={count ?? ''} className="flex items-center gap-2 whitespace-nowrap">
                      {kind && <RecordKindIcon kind={kind} size="sm" />}
                      {t(`tabs.${tab}`)}
                      {count !== undefined && count > 0 && (
                        <span className="min-w-5 rounded-full bg-surface-2 px-1.5 text-caption tabular-nums text-text-secondary">{count}</span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            <Link
              href="/patient/prescriptions"
              className="inline-flex items-center gap-1 rounded-sm text-small text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {t('tabs.medications')}
              <Icon icon={ArrowRight} size="xs" flipRtl />
              <span className="font-medium text-care-text">{t('tabs.prescriptions')}</span>
            </Link>
          </div>

          <TabsContent value="overview" className="mt-0">
            <h2 className="sr-only">{t('tabs.overview')}</h2>
            <RecordsOverview
              conditions={conditions}
              latestVisit={visits[0]}
              results={latestResults}
              documents={documentList}
              loading={{ records: records.isLoading, results: results.isLoading, documents: documents.isLoading }}
              onUpload={() => setUploadOpen(true)}
            />
          </TabsContent>

          <TabsContent value="visits" className="mt-0">
            <h2 className="sr-only">{t('tabs.visits')}</h2>
            <VisitsTimeline visits={visits} highlightId={highlighted?.type === 'visit' ? highlightId : null} />
          </TabsContent>

          <TabsContent value="conditions" className="mt-0">
            <h2 className="sr-only">{t('tabs.conditions')}</h2>
            <ConditionsPanel conditions={conditions} highlightId={highlighted?.type === 'condition' ? highlightId : null} />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <h2 className="sr-only">{t('tabs.documents')}</h2>
            <DocumentsPanel documents={documentList} loading={documents.isLoading} />
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <h2 className="sr-only">{t('tabs.results')}</h2>
            <ResultsPanel labs={labs} imaging={imaging} loading={results.isLoading} />
          </TabsContent>
        </Tabs>

        <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      </Page>
    </RequireRole>
  );
}
