import { HeartPulse, Plus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Heading } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Logo } from '@/shared/ui/logo';

export interface StatusPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  /** Extra content below the action, e.g. the trust-badges row on Sign In Required. */
  footer?: ReactNode;
}

/**
 * The shared full-page shell for Account Locked, Session Expired,
 * Unauthorized, Forbidden, and Access Denied — one visual pattern
 * (icon + title + description + action) so a visitor moving between these
 * states sees a coherent product, not five independently-designed error
 * pages.
 *
 * The dotted grids, blurred brand circles, and faint heart/plus glyphs are
 * purely decorative brand texture (clipped to the viewport, behind the
 * content) — kept out of the tab order and screen-reader tree via
 * aria-hidden.
 */
export function StatusPage({ icon, title, description, action, footer }: StatusPageProps) {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden p-8 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary-subtle opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-primary-subtle opacity-60 blur-3xl" />
        <div
          className="absolute top-10 left-10 size-24 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
        <div
          className="absolute right-10 bottom-10 size-24 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
        <Icon icon={HeartPulse} className="absolute top-1/3 left-8 size-20 text-primary opacity-10 md:left-16" />
        <Icon icon={Plus} className="absolute top-1/2 right-8 size-16 text-primary opacity-10 md:right-16" />
      </div>
      <div className="flex items-center gap-2">
        <Logo size="md" />
        <span className="text-2xl font-bold text-text-primary">Orivex</span>
      </div>
      <div className="flex size-16 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
        <Icon icon={icon} size="lg" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <Heading as="h1" level={2}>{title}</Heading>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {action}
      {footer}
    </div>
  );
}
