import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RecordKindIcon, type RecordKind } from '@/features/patient/components/records/record-kinds';
import { cn } from '@/shared/lib/cn';

/** A list of records: hairlines between rows, none after the last. */
export function RecordList({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className={cn('flex flex-col divide-y divide-border-default', className)}>
      {children}
    </ul>
  );
}

export interface RecordRowProps {
  /** The record's id, on the row (`data-record-id`) -- one record is never rendered twice on a view. */
  id: string;
  kind: RecordKind;
  icon?: LucideIcon;
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
  /** At the inline end: a link or a status. */
  trailing?: ReactNode;
  /** Ringed: the record a link pointed at (`?highlight=<id>`). */
  highlighted?: boolean;
}

/**
 * One record in a list: its kind's glyph on its tint, the title (14/600, own text direction), an optional
 * two-line body, a 12px meta line (date, doctor) and an optional trailing action. 12px top and bottom on
 * every row, the first included.
 */
export function RecordRow({ id, kind, icon, title, meta, body, trailing, highlighted }: RecordRowProps) {
  return (
    <li data-record-id={id} className={cn('flex scroll-mt-12 items-start gap-3 py-3', highlighted && '-mx-2 rounded-md px-2 ring-2 ring-focus-ring')}>
      <RecordKindIcon kind={kind} icon={icon} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p dir="auto" className="text-sm font-semibold text-text-primary rtl:text-right">
          {title}
        </p>
        {body && (
          <p dir="auto" className="line-clamp-2 text-small text-text-secondary rtl:text-right">
            {body}
          </p>
        )}
        {meta && <p className="text-xs text-text-tertiary">{meta}</p>}
      </div>
      {trailing && <div className="flex shrink-0 items-center self-center">{trailing}</div>}
    </li>
  );
}
