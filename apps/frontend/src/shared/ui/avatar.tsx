import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { forwardRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { SPECIALTY_HUE_CLASSES, type SpecialtyHue } from '@/shared/lib/specialty-palette';

// 24 / 32 / 40 / 56 / 96.
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClass: Record<AvatarSize, string> = {
  xs: 'size-6 text-caption',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-24 text-2xl',
};

/** Up to two initials from a display name (Latin or Arabic). */
export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter((part) => part && !/^(dr\.?|د\.?)$/i.test(part))
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase() ?? '')
    .join('');
}

/** A deterministic hue from a name hash, so the same person always gets the same tint (never a uniform grey). */
export function avatarHue(name: string): SpecialtyHue {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return ((Math.abs(hash) % 9) + 1) as SpecialtyHue;
}

export const Avatar = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: AvatarSize }
>(({ className, size = 'md', ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex shrink-0 overflow-hidden rounded-full', sizeClass[size], className)}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

export const AvatarImage = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('size-full object-cover', className)} {...props} />
));
AvatarImage.displayName = 'AvatarImage';

export const AvatarFallback = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    /** The person's name -- picks a deterministic tint. Without it the fallback is a neutral tile. */
    name?: string;
  }
>(({ className, name, ...props }, ref) => {
  const hue = name ? SPECIALTY_HUE_CLASSES[avatarHue(name)] : undefined;
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        'flex size-full items-center justify-center font-semibold',
        hue ? `${hue.tile} ${hue.glyph}` : 'bg-surface-2 text-text-secondary',
        className,
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = 'AvatarFallback';

export interface PersonAvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

/** The standard person avatar: their photo, or initials on a name-derived tint. Use this instead of composing Avatar + Image + Fallback by hand. */
export function PersonAvatar({ name, src, size = 'md', className }: PersonAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback name={name}>
        <bdi>{initialsOf(name)}</bdi>
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Optional presence dot, composed alongside Avatar rather than built into it
 * — feeds Phase 21's realtime presence data once that phase exists; this
 * component only renders whatever status prop it's given.
 */
export function AvatarPresenceDot({ status, className }: { status: 'online' | 'offline' | 'busy'; className?: string }) {
  const colorByStatus: Record<typeof status, string> = {
    online: 'bg-success',
    offline: 'bg-neutral',
    busy: 'bg-danger',
  };
  return (
    <span
      className={cn('absolute end-0 bottom-0 size-2.5 rounded-full ring-2 ring-surface', colorByStatus[status], className)}
      aria-hidden="true"
    />
  );
}
