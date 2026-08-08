'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { PatientProfileForm } from '@/features/patient/components/profile/patient-profile-form';
import { PatientProfileView } from '@/features/patient/components/profile/patient-profile-view';
import { usePatientProfile } from '@/features/patient/hooks/use-patient-profile';
import { PersonalInfoStep } from '@/features/identity/components/personal-info-step';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Patient Profile page — View mode by default, toggles to the Edit
 * architecture (`PatientProfileForm`) via a card-level action. Mirrors the
 * Doctor Profile page's View/Edit toggle pattern exactly.
 */
export default function PatientProfilePage() {
  const t = useTranslations('patient.profile');
  const { data: profile, isLoading, isError } = usePatientProfile();
  const { data: account } = useMyAccount();
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('subtitle')} />

        {isLoading && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-6" aria-busy="true" aria-live="polite">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        )}

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {profile && mode === 'view' && <PatientProfileView profile={profile} onEdit={() => setMode('edit')} />}
        {profile && mode === 'edit' && (
          <div className="flex flex-col gap-6">
            <PersonalInfoStep account={account} onSaved={() => {}} />
            <PatientProfileForm profile={profile} onSaved={() => setMode('view')} onCancel={() => setMode('view')} />
          </div>
        )}
      </Page>
    </RequireRole>
  );
}
