import { Loader2 } from 'lucide-react';
import { Icon, type IconSize } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface SpinnerProps {
  size?: IconSize;
  className?: string;
  /** Accessible label for a spinner used standalone (not inside an already-labeled busy control like Button's `loading` prop). */
  label?: string;
}

/** Indeterminate loading indicator — for actions of unknown duration. For known-shape content, use Skeleton instead (Phase 1's loading-pattern decision: skeleton for known shape, spinner for unknown duration). */
export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return <Icon icon={Loader2} size={size} label={label} className={cn('animate-spin', className)} />;
}
