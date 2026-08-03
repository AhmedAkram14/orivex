'use client';

import { CheckCircle2, ClipboardList, FileText, History, Mail, Phone, Search, Stethoscope, User, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { RequireRole } from '@/shared/auth/require-role';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { ConsultationContainer } from '@/shared/ui/consultation/consultation-container';
import { EmptyWorkspace } from '@/shared/ui/layout/empty-workspace';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

type Section = 'overview' | 'vitals' | 'notes' | 'history';

const SECTIONS: { id: Section; icon: typeof Stethoscope }[] = [
  { id: 'overview', icon: ClipboardList },
  { id: 'vitals', icon: Stethoscope },
  { id: 'notes', icon: FileText },
  { id: 'history', icon: History },
];

const PATIENT_FIELDS = [
  { key: 'name', icon: User },
  { key: 'age', icon: UserRound },
  { key: 'phone', icon: Phone },
  { key: 'email', icon: Mail },
] as const;

/**
 * The Consultation Workspace — the three-pane layout (Left Navigation,
 * Main Workspace, Right Information Panel) future consultation tooling
 * will render inside. Placeholder containers only: switching the left
 * nav's section changes which placeholder shows in the main pane, but no
 * medical form or real consultation data exists yet, per this phase's
 * explicit scope. The "Overview" section gets a real illustrated empty
 * state (matching the approved reference design) since it's the genuine
 * entry point -- "Open Patient Queue" links to the real `/doctor/queue`
 * page, the actual place a consultation session is started from. Vitals/
 * Notes/History keep the plain "not built yet" placeholder since those
 * tools genuinely don't exist, independent of whether a patient is picked.
 */
export default function DoctorConsultationPage() {
  const t = useTranslations('doctor.consultation');
  const [section, setSection] = useState<Section>('overview');
  const activeSection = SECTIONS.find((s) => s.id === section)!;

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader
          breadcrumbs={<AppBreadcrumbs />}
          title={t('title')}
          actions={
            <Badge variant="success" className="gap-1.5 px-3 py-1">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              {t('moduleReady')}
            </Badge>
          }
        />

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
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm outline-none transition-colors',
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
            <>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <Icon icon={User} size="md" />
                </span>
                <h2 className="text-lg font-semibold text-text-primary">{t('patientPanelTitle')}</h2>
              </div>
              <p className="text-sm text-text-secondary">{t('patientPanelDescription')}</p>

              <div className="flex flex-col gap-3">
                {PATIENT_FIELDS.map(({ key, icon }) => (
                  <div key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <Icon icon={icon} size="sm" />
                      {t(`patientFields.${key}`)}
                    </span>
                    <span className="text-text-tertiary">—</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-start gap-2 rounded-xl bg-secondary-subtle p-3 text-sm text-text-secondary">
                <Icon icon={CheckCircle2} size="sm" className="mt-0.5 shrink-0 text-text-tertiary" />
                {t('patientPanelHint')}
              </div>
            </>
          }
        >
          {section === 'overview' ? (
            <div className="flex h-full flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <Icon icon={activeSection.icon} size="md" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">{t('sections.overview')}</h2>
                  <p className="text-sm text-text-secondary">{t('overviewDescription')}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
                <div className="relative h-40 w-56">
                  <Image src="/overview.PNG" alt="" fill sizes="224px" className="object-contain" priority />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-text-primary">{t('selectPatientTitle')}</p>
                  <p className="max-w-xs text-sm text-text-secondary">{t('selectPatientDescription')}</p>
                </div>
                <Button asChild>
                  <Link href="/doctor/queue">
                    <Icon icon={Search} size="sm" className="me-2" />
                    {t('openPatientQueue')}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <EmptyWorkspace icon={activeSection.icon} title={t(`sections.${section}`)} description={t('sectionEmptyDescription')} />
          )}
        </ConsultationContainer>
      </Page>
    </RequireRole>
  );
}
