'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { HelpCenterCard } from '@/features/shell/components/help-center-card';
import { SidebarNav } from '@/features/shell/components/sidebar-nav';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Logo } from '@/shared/ui/logo';
import { Drawer } from '@/shared/ui/side-panel';

/** The small-viewport equivalent of the desktop `Sidebar` — the same `SidebarNav` content inside a `Drawer` (side-anchored, direction-aware) rather than a permanently-visible column. Explicitly closes itself on navigation (`onNavigate`) — App Router client-side navigation never unmounts this shell component, so without this the drawer would otherwise stay open over the newly-navigated page. */
export function MobileNav() {
  const t = useTranslations('shell');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('openNavigation')}>
          <Icon icon={Menu} size="md" />
        </Button>
      </Drawer.Trigger>
      <Drawer.Content side="start" className="flex w-[85vw] flex-col gap-4 overflow-y-auto">
        <Drawer.Title className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Logo size="sm" />
          {tCommon('appName')}
        </Drawer.Title>
        <SidebarNav onNavigate={() => setOpen(false)} />
        <div className="mt-auto flex flex-col gap-3 border-t border-border-default pt-3">
          <HelpCenterCard />
          <p className="px-2 text-xs text-text-tertiary">{t('footer', { year: new Date().getFullYear() })}</p>
        </div>
      </Drawer.Content>
    </Drawer>
  );
}
