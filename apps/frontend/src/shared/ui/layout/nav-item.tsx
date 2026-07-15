'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';

const itemClass = cn(
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors duration-(--duration-fast)',
  'text-text-secondary hover:bg-secondary-subtle hover:text-text-primary',
  'focus-visible:ring-2 focus-visible:ring-focus-ring',
  'data-[active=true]:bg-primary-subtle data-[active=true]:font-medium data-[active=true]:text-primary',
);

export interface NavItemProps {
  label: string;
  icon?: LucideIcon;
  href: string;
  active?: boolean;
  badge?: ReactNode;
  className?: string;
}

/** A single leaf nav entry — a real link (native browser Tab order, no custom roving-tabindex, since this is a navigation landmark, not a toolbar/menu per WAI-ARIA APG). `active` sets `aria-current="page"`, the accessible signal screen readers use for "you are here," styled via the `data-active` selector rather than a conditional className string. */
export function NavItem({ label, icon, href, active = false, badge, className }: NavItemProps) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} data-active={active} className={cn(itemClass, className)}>
      {icon && <Icon icon={icon} size="sm" className="shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {badge}
    </Link>
  );
}

export interface NavGroupProps {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
  /** Open by default when one of its children is the active route — passed down by the caller (which knows the current path), not computed here. */
  defaultOpen?: boolean;
  className?: string;
}

/** A collapsible group of `NavItem`s (e.g. "Clinical" containing Patients/Appointments/Prescriptions) — a disclosure widget (`aria-expanded` on the trigger button), the correct ARIA pattern for a section a user can show/hide, not a submenu. */
export function NavGroup({ label, icon, children, defaultOpen = false, className }: NavGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `nav-group-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className={itemClass}
      >
        {icon && <Icon icon={icon} size="sm" className="shrink-0" />}
        <span className="flex-1 truncate text-start">{label}</span>
        <Icon
          icon={ChevronDown}
          size="sm"
          className={cn('shrink-0 transition-transform duration-(--duration-fast)', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div id={contentId} className="ms-3 flex flex-col gap-1 border-s border-border-default ps-2 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
