import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';

export interface StatusPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * The shared full-page shell for Account Locked, Session Expired,
 * Unauthorized, Forbidden, and Access Denied — one visual pattern
 * (icon + title + description + action) so a visitor moving between these
 * states sees a coherent product, not five independently-designed error
 * pages.
 */
export function StatusPage({ icon, title, description, action }: StatusPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
        <Icon icon={icon} size="lg" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
