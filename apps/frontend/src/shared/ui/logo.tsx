import Image from 'next/image';
import { cn } from '@/shared/lib/cn';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeConfig: Record<LogoSize, { className: string; px: number }> = {
  sm: { className: 'size-6', px: 24 },
  md: { className: 'size-9', px: 36 },
  lg: { className: 'size-12', px: 48 },
  xl: { className: 'size-24', px: 96 },
};

export interface LogoProps {
  size?: LogoSize;
  className?: string;
}

/**
 * The real ORIVEX mark -- a transparent-background crop of the brand's own
 * icon (the pulse-in-a-ring), cropped from `public/orivex-icon.png` (itself
 * cropped from the brand's `logo-transparent.png`, which also carries the
 * full "ORIVEX" wordmark + tagline for larger, less frequent placements).
 * Its own colors already read on both light and dark grounds, so one file
 * covers every context this component is used in.
 */
export function Logo({ size = 'md', className }: LogoProps) {
  const { className: base, px } = sizeConfig[size];
  return (
    <Image
      src="/orivex-icon.png"
      alt="ORIVEX"
      width={px}
      height={px}
      className={cn(base, 'object-contain', className)}
      priority
    />
  );
}
