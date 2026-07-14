import type { ReactNode } from 'react';
import { PageHeader, type PageHeaderProps } from '@/shared/ui/layout/page-header';

export interface WorkspaceHeaderProps extends PageHeaderProps {
  /** Typically an `AppBreadcrumbs` (features/shell) — kept as a slot rather than imported directly so this stays a generic, feature-agnostic primitive any business module can reuse without depending on the shell feature. */
  breadcrumbs?: ReactNode;
}

/** The top of a workspace's main content area — an optional breadcrumb trail above the page's `PageHeader`. Every business-module page (once built) composes this the same way: `<Page><WorkspaceHeader breadcrumbs={...} title=... /><Section>...</Section></Page>`. */
export function WorkspaceHeader({ breadcrumbs, ...headerProps }: WorkspaceHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumbs}
      <PageHeader {...headerProps} />
    </div>
  );
}
