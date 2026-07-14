'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The authenticated landing page — real, working, and role-agnostic today,
 * since no business module (Patients/Doctors/Appointments) exists yet to
 * populate a role-specific widget grid (that's Phase 6's own dashboard
 * layout system milestone, built on top of this route). `EmptyState`
 * rather than fabricated metrics: this phase's rule is "prepare the
 * architecture, don't fake the data."
 */
export default function DashboardPage() {
  const t = useTranslations('shell.dashboard');
  const { user } = useAuth();

  return (
    <Page>
      <WorkspaceHeader title={t('title')} description={user ? t('welcome', { name: user.fullName }) : undefined} />
      <EmptyState
        icon={ShieldCheck}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
        action={
          <Button asChild variant="outline">
            <Link href="/security">
              <Icon icon={ShieldCheck} size="sm" className="me-2" />
              {t('securityCenterAction')}
            </Link>
          </Button>
        }
      />
    </Page>
  );
}
