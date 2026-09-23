import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface InfoTileProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
}

export function InfoTile({ icon, iconClassName, label, value }: InfoTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-default/70 bg-surface p-3">
      <div className={cn('flex size-8 items-center justify-center rounded-lg', iconClassName)}>
        <Icon icon={icon} size="sm" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}
