'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DoctorSettingsForm } from '@/features/doctor/components/settings/doctor-settings-form';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/** The Doctor Workspace's "Settings" page — theme + language preferences, both genuinely functional. */
export default function DoctorSettingsPage() {
  const t = useTranslations('doctor.settingsPage');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <DoctorSettingsForm />
      </Page>
    </RequireRole>
  );
}
