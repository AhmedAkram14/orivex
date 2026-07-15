'use client';

import { ClipboardList, FileText, History, Stethoscope, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { RequireRole } from '@/shared/auth/require-role';
import { cn } from '@/shared/lib/cn';
import { ConsultationContainer } from '@/shared/ui/consultation/consultation-container';
import { EmptyWorkspace } from '@/shared/ui/layout/empty-workspace';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

type Section = 'overview' | 'vitals' | 'notes' | 'history';

const SECTIONS: { id: Section; icon: typeof Stethoscope }[] = [
  { id: 'overview', icon: Stethoscope },
  { id: 'vitals', icon: ClipboardList },
  { id: 'notes', icon: FileText },
  { id: 'history', icon: History },
];

/**
 * The Consultation Workspace — the three-pane layout (Left Navigation,
 * Main Workspace, Right Information Panel) future consultation tooling
 * will render inside. Placeholder containers only: switching the left
 * nav's section changes which empty-state placeholder shows in the main
 * pane, but no medical form or real consultation data exists yet, per
 * this phase's explicit scope.
 */
export default function DoctorConsultationPage() {
  const t = useTranslations('doctor.consultation');
  const [section, setSection] = useState<Section>('overview');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />

        <ConsultationContainer
          leftNav={
            <nav aria-label={t('sectionsLabel')} className="flex flex-col gap-1">
              {SECTIONS.map(({ id, icon: SectionIcon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  aria-current={section === id ? 'true' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm outline-none transition-colors',
                    'text-text-secondary hover:bg-secondary-subtle hover:text-text-primary',
                    'focus-visible:ring-2 focus-visible:ring-focus-ring',
                    section === id && 'bg-primary-subtle font-medium text-primary',
                  )}
                >
                  <SectionIcon className="size-4 shrink-0" aria-hidden="true" />
                  {t(`sections.${id}`)}
                </button>
              ))}
            </nav>
          }
          rightPanel={
            <EmptyWorkspace icon={User} title={t('patientPanelTitle')} description={t('patientPanelDescription')} />
          }
        >
          <EmptyWorkspace
            icon={SECTIONS.find((s) => s.id === section)!.icon}
            title={t(`sections.${section}`)}
            description={t('sectionEmptyDescription')}
          />
        </ConsultationContainer>
      </Page>
    </RequireRole>
  );
}
