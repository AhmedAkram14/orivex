'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { PatientProfileForm } from '@/features/patient/components/profile/patient-profile-form';
import { PatientProfileView } from '@/features/patient/components/profile/patient-profile-view';
import { usePatientProfile } from '@/features/patient/hooks/use-patient-profile';
import { RequireRole } from '@/shared/auth/require-role';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Patient Profile page — View mode by default, toggles to the Edit
 * architecture (`PatientProfileForm`) via the header action. Mirrors the
 * Doctor Profile page's View/Edit toggle pattern exactly.
 */
export default function PatientProfilePage() {
  const t = useTranslations('patient.profile');
  const { data: profile, isLoading, isError } = usePatientProfile();
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader
          breadcrumbs={<AppBreadcrumbs />}
          title={t('title')}
          actions={
            profile && mode === 'view' ? (
              <Button variant="outline" onClick={() => setMode('edit')}>
                <Icon icon={Pencil} size="sm" className="me-2" />
                {t('editProfile')}
              </Button>
            ) : undefined
          }
        />

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

        {profile && mode === 'view' && <PatientProfileView profile={profile} />}
        {profile && mode === 'edit' && (
          <PatientProfileForm profile={profile} onSaved={() => setMode('view')} onCancel={() => setMode('view')} />
        )}
      </Page>
    </RequireRole>
  );
}
