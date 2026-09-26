import { cn } from '@/shared/lib/cn';
import { getSpecialtyStyle, SPECIALTY_HUE_CLASSES } from '@/shared/lib/specialty-palette';
import { Icon } from '@/shared/icons/icon';

export interface SpecialtyChipProps {
  /** The canonical (English) specialty name -- used to pick the hue and glyph, never displayed. */
  name: string;
  /** The localized label to show. */
  label: string;
  className?: string;
}

/** A specialty pill in its fixed hue (tint + glyph) -- identical on the landing page, the doctor directory and the specialties page. */
export function SpecialtyChip({ name, label, className }: SpecialtyChipProps) {
  const style = getSpecialtyStyle(name);
  const hue = SPECIALTY_HUE_CLASSES[style.hue];
  return (
    <span
      className={cn(
        'inline-flex h-5.5 max-w-full items-center gap-1 rounded-full px-2.5 text-caption font-semibold tracking-normal',
        hue.tile,
        hue.glyph,
        className,
      )}
    >
      <Icon icon={style.icon} size="xs" className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export interface SpecialtyIconTileProps {
  name: string;
  /** 40px (default) or 56px. */
  size?: 'md' | 'lg';
  className?: string;
}

/** The specialty's glyph on its tint -- an icon tile, never a solid saturated disc. */
export function SpecialtyIconTile({ name, size = 'md', className }: SpecialtyIconTileProps) {
  const style = getSpecialtyStyle(name);
  const hue = SPECIALTY_HUE_CLASSES[style.hue];
  return (
    <span
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center rounded-md', size === 'lg' ? 'size-14' : 'size-10', hue.tile, hue.glyph, className)}
    >
      <Icon icon={style.icon} size={size === 'lg' ? 'lg' : 'md'} />
    </span>
  );
}
