import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';

/**
 * The list rows the Overview's lower cards share (Active prescriptions, Recent activity, Recent medical
 * records): every row 12px top and bottom -- the first one too -- with a hairline between rows and none
 * after the last; a 20px glyph in a 32px neutral circle (meaning is in the glyph, never its colour); a
 * 14/600 title, a 13px muted body clamped to two lines and a 12px muted meta line of its own; and an
 * optional trailing mark at the inline end (an unread dot, a status badge).
 */
export function OverviewList({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={cn('flex flex-col divide-y divide-border-default', className)}>{children}</ul>;
}

export interface OverviewRowProps {
  icon: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
  /** A native tooltip on the meta line (e.g. the absolute time behind a relative one). */
  metaTitle?: string;
  trailing?: ReactNode;
  /** The row is one link to this address... */
  href?: string;
  /** ...or one button (e.g. mark as read), or neither (static). */
  onClick?: () => void;
  disabled?: boolean;
}

// The hover/focus fill reaches 12px past the text on both sides (`-mx-3 px-3`), so the row's text stays
// on the card's content edge -- the same x as every other card's text above and beside it.
const rowClassName = cn(
  '-mx-3 flex w-[calc(100%+1.5rem)] items-start gap-3 rounded-(--r-sm) px-3 py-3 text-start',
  'transition-colors duration-(--duration-fast)',
);
const interactiveClassName = cn(
  'hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
  'disabled:cursor-default disabled:hover:bg-transparent',
);

// Title and body are often data in another language (an English medication in the Arabic UI): each takes
// its own direction, so "5 mg, once daily" never reads "mg, once daily 5" and a clamped line ends in its
// own ellipsis -- but stays on the row's start edge (right in Arabic), in line with everything else.
const dataTextClassName = 'rtl:text-right';

export function OverviewRow({ icon, title, body, meta, metaTitle, trailing, href, onClick, disabled }: OverviewRowProps) {
  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-primary" aria-hidden="true">
        <Icon icon={icon} size="md" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span dir="auto" className={cn('text-sm font-semibold text-text-primary', dataTextClassName)}>
          {title}
        </span>
        {body && (
          <span dir="auto" className={cn('line-clamp-2 text-small text-text-secondary', dataTextClassName)}>
            {body}
          </span>
        )}
        {meta && (
          <span className="text-xs text-text-tertiary" title={metaTitle}>
            {meta}
          </span>
        )}
      </span>
      {trailing && <span className="flex shrink-0 items-center self-start pt-0.5">{trailing}</span>}
    </>
  );

  if (href) {
    return (
      <li>
        <Link href={href} onClick={onClick} className={cn(rowClassName, interactiveClassName)}>
          {content}
        </Link>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} disabled={disabled} className={cn(rowClassName, interactiveClassName)}>
          {content}
        </button>
      </li>
    );
  }
  return (
    <li>
      <div className={rowClassName}>{content}</div>
    </li>
  );
}

/** A 6px unread mark at the row's inline end; "Unread" is its text alternative. */
export function UnreadDot({ label }: { label: string }) {
  return (
    <span className="flex h-5 items-center">
      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * The card header's action: a text link at the inline end, 32px tall so every header is the same 32px
 * whether or not it has one. The visible label stays short ("View all"); `context` names what it opens.
 */
export function CardHeaderLink({ href, label, context }: { href: string; label: string; context?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-sm text-sm font-medium text-care-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      {label}
      {context && <span className="sr-only"> {context}</span>}
    </Link>
  );
}
