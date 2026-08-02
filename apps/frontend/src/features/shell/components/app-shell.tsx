'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { CommandPalette } from '@/features/shell/components/command-palette';
import { HelpCenterCard } from '@/features/shell/components/help-center-card';
import { MobileNav } from '@/features/shell/components/mobile-nav';
import { NotificationBell } from '@/features/shell/components/notification-bell';
import { SidebarNav } from '@/features/shell/components/sidebar-nav';
import { UserMenu } from '@/features/shell/components/user-menu';
import { Link } from '@/shared/i18n/navigation';
import { useRealtimeSocket } from '@/shared/lib/realtime/use-realtime-socket';
import { Content } from '@/shared/ui/layout/content';
import { Logo } from '@/shared/ui/logo';
import { Sidebar } from '@/shared/ui/layout/sidebar';
import { Topbar } from '@/shared/ui/layout/topbar';

/**
 * The Root Dashboard Layout — every route under `(protected)` renders
 * inside this. Composes the structural primitives from `shared/ui/layout`
 * (Topbar/Sidebar/Content/Footer, which know nothing about auth or nav
 * content) with this feature's session-aware pieces (`SidebarNav`,
 * `UserMenu`, `MobileNav`). Assumes an authenticated session — it is only
 * ever rendered inside `RequireAuth` (`app/[locale]/(protected)/layout.tsx`),
 * never standalone.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('shell');
  const tCommon = useTranslations('common');
  useRealtimeSocket();

  return (
    <div className="flex h-screen flex-col">
      <Topbar>
        <MobileNav />
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Logo size="sm" />
          {tCommon('appName')}
        </Link>
        <div className="ms-auto flex items-center gap-2">
          <CommandPalette />
          <NotificationBell />
          <UserMenu />
        </div>
      </Topbar>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden lg:flex">
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="flex flex-col gap-3 border-t border-border-default pt-3">
            <HelpCenterCard />
            <p className="px-2 text-xs text-text-tertiary">{t('footer', { year: new Date().getFullYear() })}</p>
          </div>
        </Sidebar>
        <Content>{children}</Content>
      </div>
    </div>
  );
}
