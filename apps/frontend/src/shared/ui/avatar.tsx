import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { forwardRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { SPECIALTY_HUE_CLASSES, type SpecialtyHue } from '@/shared/lib/specialty-palette';

/**
 * One size scale, each paired with the text beside it (docs/16-design-system.md, "Avatars"):
 *   xs 24 -- one 13-14px line (inline before a name, activity items, chips)
 *   sm 32 -- one 15px line, or 13px + 12px (table rows, sticky patient header)
 *   md 40 -- two lines, 15px + 13px (booking doctor chip, needs-attention rows, conversations)
 *   lg 56 -- a name plus one or two short meta lines (doctor cards, popovers)
 *   xl 96 -- a hero name at h1/display size (patient chart, profiles)
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Initials are 40% of the diameter (24 -> 9.6px ... 96 -> 38.4px), so a fallback reads as a sibling of the photos.
const sizeClass: Record<AvatarSize, string> = {
  xs: 'size-6 text-[0.6rem]',
  sm: 'size-8 text-[0.8rem]',
  md: 'size-10 text-[1rem]',
  lg: 'size-14 text-[1.4rem]',
  xl: 'size-24 text-[2.4rem]',
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
    data-slot="avatar"
    data-size={size}
    className={cn(
      'relative flex shrink-0 overflow-hidden rounded-full leading-none',
      // A 1px hairline drawn above the photo or initials (an overlay, since an inset shadow would sit under the image).
      "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_0_0_1px_var(--color-avatar-ring)] after:content-['']",
      sizeClass[size],
      className,
    )}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

export const AvatarImage = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  // Face-biased crop: portrait sources keep the face in the circle instead of centring on the chest.
  <AvatarPrimitive.Image ref={ref} className={cn('size-full object-cover object-[50%_22%]', className)} {...props} />
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

/**
 * The standard person avatar: their photo, or initials on a name-derived tint. Use this instead of composing
 * Avatar + Image + Fallback by hand. Decorative (`aria-hidden`): the person's name is always shown beside it, and
 * the initials would otherwise be read into a row's accessible name ("SA, Sarah Ahmed").
 */
export function PersonAvatar({ name, src, size = 'md', className }: PersonAvatarProps) {
  return (
    <Avatar size={size} className={className} aria-hidden="true">
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
