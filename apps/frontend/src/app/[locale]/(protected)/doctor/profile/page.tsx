'use client';

import { Eye } from 'lucide-react';
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
 * architecture (`DoctorProfileForm`) via `DoctorProfileView`'s own Quick
 * Actions "Edit Profile" tile (the redesigned view's `onEdit` prop) rather
 * than a header action now that the hero itself carries an Edit affordance
 * too. `DoctorProfileView` doubles as the patient-facing read-only variant
 * (see that component's own comment): there is no separate read-only
 * component to keep in sync, just `variant="public"` there omitting every
 * workspace-only affordance.
 */
export default function DoctorProfilePage() {
  const t = useTranslations('doctor.profile');
  const { data: profile, isLoading, isError } = useDoctorProfile();
  const [mode, setMode] = useState<'view' | 'edit' | 'preview'>('view');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        {/* The H1 itself is the mode signal -- "Profile" in view mode,
            "Edit profile" once the page swaps to the bare form, so the
            page never looks the same in both modes with nothing marking
            which one you're in. */}
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={mode === 'edit' ? t('editProfile') : t('title')} />

        {mode === 'preview' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-subtle px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-primary-emphasis">
              <Icon icon={Eye} size="sm" />
              {t('previewBanner')}
            </span>
            <Button variant="outline" size="sm" onClick={() => setMode('view')}>
              {t('exitPreview')}
            </Button>
          </div>
        )}

        {isLoading && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-6" aria-busy="true" aria-live="polite">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        )}

        {/* A Doctor-role account with no profile row is a genuine anomaly
            here (unlike onboarding, where it's the expected pre-registration
            state) -- `useDoctorProfile` resolves a 404 to `undefined` rather
            than throwing, so that anomaly has to be checked explicitly. */}
        {(isError || (!isLoading && !profile)) && <Alert variant="danger">{t('loadError')}</Alert>}

        {profile && mode === 'view' && (
          <DoctorProfileView profile={profile} onEdit={() => setMode('edit')} onPreview={() => setMode('preview')} />
        )}
        {profile && mode === 'edit' && (
          <DoctorProfileForm profile={profile} onSaved={() => setMode('view')} onCancel={() => setMode('view')} />
        )}
        {/* variant="public": the same component the patient-facing route
            renders, not a separate read-only stand-in that could drift out
            of sync with what patients actually see. */}
        {profile && mode === 'preview' && <DoctorProfileView profile={profile} variant="public" />}
      </Page>
    </RequireRole>
  );
}
