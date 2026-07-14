'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { CommandPalette } from '@/features/shell/components/command-palette';
import { MobileNav } from '@/features/shell/components/mobile-nav';
import { SidebarNav } from '@/features/shell/components/sidebar-nav';
import { UserMenu } from '@/features/shell/components/user-menu';
import { Link } from '@/shared/i18n/navigation';
import { Content } from '@/shared/ui/layout/content';
import { Footer } from '@/shared/ui/layout/footer';
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

  return (
    <div className="flex h-screen flex-col">
      <Topbar>
        <MobileNav />
        <Link href="/dashboard" className="text-lg font-semibold text-text-primary">
          {tCommon('appName')}
        </Link>
        <div className="ms-auto flex items-center gap-2">
          <CommandPalette />
          <UserMenu />
        </div>
      </Topbar>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden lg:flex">
          <SidebarNav />
        </Sidebar>
        <Content>{children}</Content>
      </div>
      <Footer className="hidden lg:block">{t('footer', { year: new Date().getFullYear() })}</Footer>
    </div>
  );
}
