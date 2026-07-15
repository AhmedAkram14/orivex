'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DoctorProfileForm } from '@/features/doctor/components/profile/doctor-profile-form';
import { DoctorProfileView } from '@/features/doctor/components/profile/doctor-profile-view';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { RequireRole } from '@/shared/auth/require-role';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Profile page — View mode by default, toggles to the Edit
 * architecture (`DoctorProfileForm`) via the header action. `DoctorProfileView`
 * doubles as the Read-only mode (see that component's own comment):
 * there is no separate read-only variant, just this page never rendering
 * the Edit action for a viewer without access.
 */
export default function DoctorProfilePage() {
  const t = useTranslations('doctor.profile');
  const { data: profile, isLoading, isError } = useDoctorProfile();
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
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

        {profile && mode === 'view' && <DoctorProfileView profile={profile} />}
        {profile && mode === 'edit' && (
          <DoctorProfileForm profile={profile} onSaved={() => setMode('view')} onCancel={() => setMode('view')} />
        )}
      </Page>
    </RequireRole>
  );
}
