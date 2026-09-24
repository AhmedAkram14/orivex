'use client';

import { Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * Phase 2 (Appointment Visibility & Consultation History), item 6: a
 * branded 404 for any unmatched route under the authenticated app shell --
 * previously there was none anywhere in `app/`, so a stale/mistyped link
 * (e.g. the pre-Phase-2 `/doctor/appointments` 404) fell through to Next's
 * default unstyled not-found page instead of this product's own chrome.
 * Rendered inside `AppShell` (this file lives under `(protected)`, whose
 * `layout.tsx` already wraps every child in it) -- reuses `EmptyState` +
 * the same `Page`/`WorkspaceHeader` shell every real page in this app uses,
 * rather than a one-off standalone screen. `/dashboard` is the deliberate
 * link target: a real, role-agnostic redirect-only route that always lands
 * on the right workspace's own Overview page (see `navigation.ts`'s own
 * comment on why it isn't nav-reachable but still exists for exactly this).
 */
export default function ProtectedNotFound() {
  const t = useTranslations('notFoundPage');

  return (
    <Page>
      <WorkspaceHeader title={t('title')} description={t('description')} />
      <EmptyState
        icon={Compass}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
        action={
          <Button asChild>
            <Link href="/dashboard">{t('backHome')}</Link>
          </Button>
        }
      />
    </Page>
  );
}
