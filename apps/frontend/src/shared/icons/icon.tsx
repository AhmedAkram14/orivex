import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeClass: Record<IconSize, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

export interface IconProps {
  /** Any lucide-react icon component. Kept generic (not a fixed icon-name union) so this wrapper does not need to change if the underlying icon set is ever swapped — see roadmap Section 1.1's icon-vendor note. */
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  /**
   * True only for icons that mean something directional (back/forward,
   * expand/collapse chevrons) — these flip under `dir="rtl"` per Phase 1's
   * icon-mirroring policy. Symmetric icons (search, close, check) must leave
   * this false; mirroring them would be visually wrong, not just unnecessary.
   */
  flipRtl?: boolean;
  /**
   * Accessible label. Omit only when the icon is purely decorative AND is
   * always paired with adjacent visible text that already conveys its
   * meaning — in that case the icon is marked `aria-hidden` instead.
   */
  label?: string;
}

export function Icon({ icon: LucideIconComponent, size = 'md', className, flipRtl = false, label }: IconProps) {
  return (
    <LucideIconComponent
      className={cn(sizeClass[size], flipRtl && 'rtl:-scale-x-100', className)}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable={false}
    />
  );
}
