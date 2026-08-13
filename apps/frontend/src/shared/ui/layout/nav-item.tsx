'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { SidebarSectionLabel } from '@/shared/ui/layout/sidebar';
import { cn } from '@/shared/lib/cn';

const itemClass = cn(
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors duration-(--duration-fast)',
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
  /** Renders as an inert `<span>` instead of a `Link` -- no navigation, no hover/focus affordance, `aria-disabled` for assistive tech. For a destination that's a real page but not the right one to link to from this exact context (e.g. a role whose own workspace already serves as its "Dashboard"). */
  disabled?: boolean;
  /** Fires on click, in addition to the real navigation -- e.g. the mobile nav drawer closes itself once a destination is chosen, rather than staying open over the new page. */
  onClick?: () => void;
}

/** A single leaf nav entry — a real link (native browser Tab order, no custom roving-tabindex, since this is a navigation landmark, not a toolbar/menu per WAI-ARIA APG). `active` sets `aria-current="page"`, the accessible signal screen readers use for "you are here," styled via the `data-active` selector rather than a conditional className string. */
export function NavItem({ label, icon, href, active = false, badge, className, disabled = false, onClick }: NavItemProps) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(itemClass, 'pointer-events-none cursor-default text-text-tertiary hover:bg-transparent hover:text-text-tertiary', className)}>
        {icon && <Icon icon={icon} size="sm" className="shrink-0" />}
        <span className="flex-1 truncate">{label}</span>
        {badge}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      data-active={active}
      onClick={onClick}
      className={cn(itemClass, className)}
    >
      {icon && <Icon icon={icon} size="sm" className="shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {badge}
    </Link>
  );
}

export interface NavGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * A named section of `NavItem`s (e.g. "Doctor Workspace" containing
 * Overview/Profile/Schedule/Patient Queue/Consultation) — a plain,
 * always-visible heading (`SidebarSectionLabel`), not a disclosure widget.
 * Previously collapsible (click to expand/collapse); every workspace
 * section is now always expanded, matching the reference sidebar design,
 * so there's no state, no `aria-expanded`, and no per-item indent border
 * to visually set apart a "hidden by default" region that no longer exists.
 */
export function NavGroup({ label, children, className }: NavGroupProps) {
  return (
    <div className={className}>
      <SidebarSectionLabel className="uppercase tracking-wide">{label}</SidebarSectionLabel>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}
