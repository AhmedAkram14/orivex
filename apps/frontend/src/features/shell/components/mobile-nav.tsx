'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SidebarNav } from '@/features/shell/components/sidebar-nav';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/side-panel';

/** The small-viewport equivalent of the desktop `Sidebar` — the same `SidebarNav` content inside a `Drawer` (side-anchored, direction-aware) rather than a permanently-visible column. Closes on navigation since `SidebarNav`'s links are real `Link`s causing a route change, which unmounts this component's open state along with the rest of the page — no explicit close-on-navigate wiring needed. */
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
      <Drawer.Content side="start" className="flex flex-col gap-4 overflow-y-auto">
        <Drawer.Title className="text-lg font-semibold text-text-primary">{tCommon('appName')}</Drawer.Title>
        <SidebarNav />
      </Drawer.Content>
    </Drawer>
  );
}
