import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/** A list item inside a Card: quiet `surface-2` fill, no border, radius 12. Use for rows of credentials, medications, activity -- not for standalone panels (that is Card). */
export function InsetRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-3 rounded-md bg-surface-2 px-4 py-3', className)} {...props} />;
}
