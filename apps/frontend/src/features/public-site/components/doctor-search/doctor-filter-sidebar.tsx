'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DoctorFilterPanel, type DoctorFilterPanelProps } from '@/features/public-site/components/doctor-search/doctor-filter-panel';
import { Icon } from '@/shared/icons/icon';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Sheet } from '@/shared/ui/side-panel';

export interface DoctorFilterSidebarProps extends DoctorFilterPanelProps {
  activeCount: number;
  onClear: () => void;
}

/** Desktop (lg+): a sticky column beside the results. Rendered once there; the mobile trigger is `DoctorFilterSheetButton`. */
export function DoctorFilterSidebar({ activeCount, onClear, ...panel }: DoctorFilterSidebarProps) {
  const t = useTranslations('publicSite.doctorSearch.filters');
  return (
    <aside aria-label={t('title')} className="hidden lg:block">
      <div className="sticky top-28 flex max-h-[calc(100dvh-8rem)] flex-col gap-4 overflow-y-auto rounded-(--r-card) border border-border-default bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body font-semibold text-text-primary">{t('title')}</h2>
          {activeCount > 0 && (
            <Button variant="link" size="sm" onClick={onClear}>
              {t('clearAll')}
            </Button>
          )}
        </div>
        <DoctorFilterPanel {...panel} />
      </div>
    </aside>
  );
}

/** Below lg: a "Filters" button opening the same panel in a bottom sheet. */
export function DoctorFilterSheetButton({ activeCount, onClear, ...panel }: DoctorFilterSidebarProps) {
  const t = useTranslations('publicSite.doctorSearch.filters');
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Sheet.Trigger asChild>
        <Button variant="secondary" className="lg:hidden">
          <Icon icon={SlidersHorizontal} size="sm" />
          {t('title')}
          {activeCount > 0 && (
            <Badge variant="primary" aria-label={t('activeCount', { count: activeCount })}>
              {activeCount}
            </Badge>
          )}
        </Button>
      </Sheet.Trigger>
      <Sheet.Content className="flex max-h-[85dvh] flex-col gap-4 rounded-t-2xl">
        <Sheet.Title className="text-h3 text-text-primary">{t('title')}</Sheet.Title>
        <div className="-mx-6 flex-1 overflow-y-auto px-6">
          <DoctorFilterPanel {...panel} />
        </div>
        <div className="flex gap-2 border-t border-border-default pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClear} disabled={activeCount === 0}>
            {t('clearAll')}
          </Button>
          <Button className="flex-1" onClick={() => setOpen(false)}>
            {t('showResults')}
          </Button>
        </div>
      </Sheet.Content>
    </Sheet>
  );
}
