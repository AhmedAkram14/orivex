import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionHeader } from '@/features/public-site/components/section-header';
import { cn } from '@/shared/lib/cn';
import { Container } from '@/shared/ui/container';
import { HeroSurface } from '@/shared/ui/hero-surface';

export interface PageHeroProps {
  label?: string;
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Rendered above the hero card (e.g. `<PublicBreadcrumbs />`). */
  breadcrumbs?: ReactNode;
  /** Search box, CTA buttons, a segmented toggle... rendered under the subtitle. */
  children?: ReactNode;
  /** Secondary row under `children` -- live stats, trust line. */
  footer?: ReactNode;
  align?: 'center' | 'start';
  /** Match the width of the page's main content below (e.g. `xl` above a sidebar + results grid). */
  size?: 'lg' | 'xl';
  className?: string;
}

/**
 * The top of every public page: clears the fixed navbar, then one hero
 * surface (the page's single `HeroSurface`) holding the page's `<h1>`.
 */
export function PageHero({ label, icon, title, subtitle, breadcrumbs, children, footer, align = 'center', size = 'lg', className }: PageHeroProps) {
  return (
    <Container size={size} className={cn('flex flex-col gap-4 pt-28 lg:pt-32', className)}>
      {breadcrumbs}
      <HeroSurface variant="patient" className="px-5 py-10 sm:px-10 sm:py-14">
        <div className={cn('flex flex-col gap-6', align === 'center' ? 'items-center' : 'items-start')}>
          <SectionHeader as="h1" label={label} icon={icon} title={title} subtitle={subtitle} align={align} />
          {children && <div className={cn('flex w-full flex-col gap-4', align === 'center' ? 'items-center' : 'items-start')}>{children}</div>}
          {footer}
        </div>
      </HeroSurface>
    </Container>
  );
}
